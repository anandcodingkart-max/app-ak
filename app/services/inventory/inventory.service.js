import { cors } from "remix-utils/cors";
import { unauthenticated } from "../../shopify.server";
import { findVariantByInventoryId } from "../../utils/helper";
import InventoryHelper from "./inventory-helper.service";
import { SERVER_ERROR } from "../../helper/status-code";
import db from "../../db.server";

class Inventory {
  async addInventoryNotificationRequest(request) {
    try {
      const body = await request.json();
      let { name, email, variantId, productId } = body;
      productId = `gid://shopify/Product/${productId}`;
      variantId = `gid://shopify/ProductVariant/${variantId}`;

      const isSubscribed = await db.InventoryNotificationRequest.findFirst({
        where: {
          email,
          variantId,
          productId,
          status: "PENDING",
        },
      });

      if (!isSubscribed) {
        await db.InventoryNotificationRequest.create({
          data: {
            name,
            email,
            variantId,
            productId,
            status: "PENDING",
          },
        });
      }

      return cors(
        request,
        Response.json({ success: true, status: 200, ok: true }),
      );
    } catch (error) {
      console.log("SERVER ERROR: ", error);
      return cors(
        request,
        Response.json({
          success: false,
          status: SERVER_ERROR,
          message: "Internal Server Error. Please try again later.",
        }),
      );
    }
  }
  async processInventoryUpdate(shop, payload) {
    try {
      const { admin } = await unauthenticated.admin(shop);
      const inventoryItemId = payload.inventory_item_id;

      const result = await findVariantByInventoryId(admin, inventoryItemId);
      if (result?.errors) {
        console.error("GraphQL Errors:", result.errors);
        return false;
      }

      const inventoryItem = result?.data?.inventoryItem;
      const shopCurrency = result?.data?.shop?.currencyCode;
      const variant = inventoryItem?.variant;
      const product = variant?.product;
      const numericVariantId = variant?.id.split("/").pop();
      const shopDomain = result?.data?.shop?.primaryDomain?.url;
      const productHandle = product?.handle;

      const extractedData = {
        productName: product?.title,
        variantName: variant?.title,
        variantPrice: variant?.price,
        variantCurrency: shopCurrency,
        variantImageUrl: variant?.image?.url || null,
        variantId: numericVariantId,
        ctaUrl: `${shopDomain}/products/${productHandle}?variant=${numericVariantId}`,
      };

      await new InventoryHelper().sendNotification(
        product.id,
        variant.id,
        extractedData,
      );

      return extractedData;
    } catch (fatal) {
      console.error("Fatal worker error:", fatal);
      throw fatal;
    }
  }
}

export default Inventory;
