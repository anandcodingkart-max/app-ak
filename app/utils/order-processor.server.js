import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import path from "path";
import fs from "fs/promises";
import { mailer } from "../utils/mailer.server";

export async function processOrder(shop, payload) {
  try {
    const { admin } = await unauthenticated.admin(shop);

    const lineItems = payload.line_items || [];
    if (!lineItems.length) return true;

    for (const item of lineItems) {
      const blendProperty = item.properties?.find((p) => p.name === "Blend");
      if (blendProperty) {
        await processOrderSwap(admin, payload, item, blendProperty);
      }
      const giftProperty = item.properties?.find(
        (p) => p.name === "giftProduct",
      );
      if (giftProperty) {
        await addGiftProduct(admin, item);
      }
      const couponCode = item.properties?.find((p) => p.name === "couponCode");
      if (couponCode) {
        await expireCoupon(item);
      }
    }

    return true;
  } catch (fatal) {
    console.error("Fatal worker error:", fatal);
    throw fatal;
  }
}
async function processOrderSwap(admin, payload, item, blendProperty) {
  try {
    if (!blendProperty?.value) return;

    const blendTag = blendProperty.value;
    const targetVariantTitle = item.variant_title;

    try {
      const productSearch = await admin.graphql(
        `#graphql
          query findProductByTag($query: String!) {
            products(first: 1, query: $query) {
              edges {
                node {
                  id
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                      }
                    }
                  }
                }
              }
            }
          }`,
        { variables: { query: `tag:${blendTag}` } },
      );

      const productData = await productSearch.json();
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

      const beginResponse = await admin.graphql(
        `#graphql
          mutation beginEdit($id: ID!) {
            orderEditBegin(id: $id) {
              calculatedOrder {
                id
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      variant {
                        id
                      }
                    }
                  }
                }
              }
              userErrors {
                message
              }
            }
          }`,
        { variables: { id: payload.admin_graphql_api_id } },
      );

      const beginData = await beginResponse.json();
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

      const editResponse = await admin.graphql(
        `#graphql
          mutation swapItem(
            $orderEditId: ID!
            $variantId: ID!
            $qty: Int!
            $calcLineItemId: ID!
          ) {
            addVariant: orderEditAddVariant(
              id: $orderEditId
              variantId: $variantId
              quantity: $qty
            ) {
              userErrors { message }
            }

            removeOld: orderEditSetQuantity(
              id: $orderEditId
              lineItemId: $calcLineItemId
              quantity: 0
            ) {
              userErrors { message }
            }
          }`,
        {
          variables: {
            orderEditId: calcOrder.id,
            variantId: matchingVariant.node.id,
            qty: item.quantity,
            calcLineItemId: itemToRemove.node.id,
          },
        },
      );

      const editData = await editResponse.json();
      const editErrors = [
        ...(editData.data?.addVariant?.userErrors || []),
        ...(editData.data?.removeOld?.userErrors || []),
      ];

      if (editErrors.length) {
        console.error("ORDER EDIT ERRORS:", editErrors);
        return;
      }

      const commitResponse = await admin.graphql(
        `#graphql
          mutation commitEdit($id: ID!) {
            orderEditCommit(id: $id) {
              order { id }
              userErrors { message }
            }
          }`,
        { variables: { id: calcOrder.id } },
      );

      const commitData = await commitResponse.json();

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

async function addGiftProduct(admin, item) {
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

    await createShopifyDiscount(admin, {
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

    await sendGiftMail(recipientEmail, {
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

function generateCouponCode(storeName = "Anand Max Store") {
  const prefix = storeName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  const timePart = Date.now().toString().slice(-4);

  return `${prefix}-${randomPart}${timePart}`;
}

async function sendGiftMail(email, data) {
  const templatePath = path.join(
    process.cwd(),
    "app/templates/gift-product.html",
  );
  const template = await fs.readFile(templatePath, "utf-8");

  const replacements = {
    recipientName: data.recipientName,
    giftMessage: data.giftMessage,
    ctaUrl: data.ctaUrl,
    couponCode: data.couponCode,
    expireDate: data.expireDate,
    year: new Date().getFullYear(),
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }

  await mailer.sendMail({
    from: `"Anand Max Store" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `🎁 You've Received a Gift!`,
    html,
  });
  console.log(`MAIL SEND TO ${data.name} at ${email}`);
}

function formatExpiryDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function getVariantData(variantId) {
  const gid = `gid://shopify/ProductVariant/${variantId}`;

  const query = `
    query getVariantDetails($id: ID!) {
      productVariant(id: $id) {
        id
        title
        price
        selectedOptions {
          name
          value
        }
      }
    }
  `;

  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: { id: gid },
      }),
    },
  );

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const variant = result.data.productVariant;

  const size = variant.selectedOptions.find(
    (opt) => opt.name.toLowerCase() === "size",
  )?.value;
  const color = variant.selectedOptions.find(
    (opt) => opt.name.toLowerCase() === "color",
  )?.value;

  return {
    variantId,
    price: variant.price,
    size: size || "N/A",
    color: color || "N/A",
  };
}

async function createShopifyDiscount(admin, { couponCode, discountAmount }) {
  const query = `#graphql
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    basicCodeDiscount: {
      title: `Gift Discount ${couponCode}`,
      code: couponCode,
      startsAt: new Date().toISOString(),

      customerSelection: {
        all: true,
      },

      customerGets: {
        value: {
          discountAmount: {
            amount: String(discountAmount),
            appliesOnEachItem: false,
          },
        },
        items: {
          all: true,
        },
      },

      appliesOncePerCustomer: true,
      usageLimit: 1,
    },
  };

  const response = await admin.graphql(query, { variables });
  const result = await response.json();

  if (result.errors) {
    console.error("GraphQL Errors:", result.errors);
    throw new Error(result.errors[0].message);
  }

  const data = result.data?.discountCodeBasicCreate;

  if (!data) {
    throw new Error("No data returned from Shopify discount mutation");
  }

  if (data.userErrors?.length) {
    console.error("Shopify User Errors:", data.userErrors);
    throw new Error(data.userErrors[0].message);
  }

  return data.codeDiscountNode.id;
}
async function expireCoupon(item) {
  try {
    const couponCode = item.properties?.find(
      (p) => p.name === "couponCode",
    )?.value;

    await db.giftProducts.updateMany({
      where: {
        couponCode: couponCode,
      },
      data: {
        status: "EXPIRED",
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}
