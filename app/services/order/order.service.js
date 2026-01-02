import OrderHelper from "./order-helper.service";
import {
  formatExpiryDate,
  generateCouponCode,
  getVariantData,
} from "../../utils/helper";
import db from "../../db.server";
class Order {
  async processOrderSwap(admin, payload, item, blendProperty) {
    try {
      if (!blendProperty?.value) return;

      const blendTag = blendProperty.value;
      const targetVariantTitle = item.variant_title;

      try {
        const productData = await new OrderHelper().getProductByTag(
          admin,
          blendTag,
        );
        const product = productData.data?.products?.edges?.[0]?.node;

        if (!product) {
          console.log(`No product found with tag: ${blendTag}`);
          return;
        }

        const matchingVariant = product.variants.edges.find(
          (v) => v.node.title === targetVariantTitle,
        );

        if (!matchingVariant) {
          console.log(
            `No variant matching title "${targetVariantTitle}" found for tag ${blendTag}`,
          );
          return;
        }

        const beginData = await await new OrderHelper().beginOrderUpdate(
          admin,
          payload,
        );
        const calcOrder = beginData.data?.orderEditBegin?.calculatedOrder;

        if (!calcOrder) {
          console.error(
            "Failed to begin order edit:",
            beginData.data?.orderEditBegin?.userErrors,
          );
          return false;
        }

        const itemToRemove = calcOrder.lineItems.edges.find(
          (edge) =>
            edge.node.variant?.id === item.variant_id ||
            edge.node.variant?.id ===
              `gid://shopify/ProductVariant/${item.variant_id}`,
        );

        if (!itemToRemove) {
          console.error(
            "Could not find the original line item within the edit session.",
          );
          return;
        }

        const editData = await new OrderHelper().editOrder(
          admin,
          calcOrder,
          matchingVariant,
          item,
          itemToRemove,
        );
        const editErrors = [
          ...(editData.data?.addVariant?.userErrors || []),
          ...(editData.data?.removeOld?.userErrors || []),
        ];

        if (editErrors.length) {
          console.error("ORDER EDIT ERRORS:", editErrors);
          return;
        }

        const commitData = await new OrderHelper().commitOrderUpdate(
          admin,
          calcOrder,
        );

        if (commitData.data?.orderEditCommit?.userErrors?.length) {
          console.error(
            "COMMIT ERRORS:",
            commitData.data.orderEditCommit.userErrors,
          );
        } else {
          console.log(`✅ Successfully swapped item in order ${payload.name}`);
        }

        return true;
      } catch (err) {
        console.error(`Error processing item ${item.title}:`, err);
        throw err;
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async addGiftProduct(admin, item) {
    try {
      const variantId = item.variant_id;
      const recipientName = item.properties?.find(
        (p) => p.name === "recipientName",
      )?.value;
      const recipientEmail = item.properties?.find(
        (p) => p.name === "recipientEmail",
      )?.value;
      const giftMessage = item.properties?.find(
        (p) => p.name === "giftMessage",
      )?.value;

      if (!recipientName || !recipientEmail || !giftMessage) return;

      const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await admin.graphql(
        `#graphql
      query getVariantDetails($id: ID!) {
        productVariant(id: $id) {
          product {
            handle
          }
        }
        shop {
           
            primaryDomain {
                url
            }
          }
      }`,
        {
          variables: {
            id: `gid://shopify/ProductVariant/${variantId}`,
          },
        },
      );

      const { data } = await response.json();

      const productHandle = data?.productVariant?.product?.handle;
      const shopDomain = data?.shop?.primaryDomain?.url;

      if (!productHandle || !shopDomain) {
        throw new Error("Could not retrieve product or shop details");
      }

      const ctaUrl = `${shopDomain}/products/nike-sportswear-subscription-gift-receiver`;
      const couponCode = generateCouponCode();
      const variantData = await getVariantData(variantId);
      const discountAmount = variantData.price;

      await new OrderHelper().createShopifyDiscount(admin, {
        couponCode,
        discountAmount,
      });

      await db.GiftProducts.create({
        data: {
          recipientName,
          recipientEmail,
          giftMessage,
          variantId: String(variantId),
          couponCode,
          expireDate,
        },
      });

      await new OrderHelper().sendGiftMail(recipientEmail, {
        recipientName: recipientName,
        giftMessage: giftMessage,
        ctaUrl: ctaUrl,
        couponCode: couponCode,
        expireDate: formatExpiryDate(expireDate),
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async expireCoupon(item) {
    try {
      const couponCode = item.properties?.find(
        (p) => p.name === "couponCode",
      )?.value;
      console.log("COUPON CODE: ", couponCode);

      await db.giftProducts.updateMany({
        where: {
          couponCode: couponCode,
        },
        data: {
          status: "EXPIRED",
        },
      });
      console.log("COUPON CODE EXPIRE SUCCESSFULL");
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
export default Order;
