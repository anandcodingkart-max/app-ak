import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import path from "path";
import fs from "fs/promises";
import { mailer } from "../utils/mailer.server";

export async function processInventoryUpdate(shop, payload) {
  try {
    const { admin } = await unauthenticated.admin(shop);
    const inventoryItemId = payload.inventory_item_id;

    const response = await admin?.graphql(
      `#graphql
        query getProductAndVariant($id: ID!) {
          inventoryItem(id: $id) {
            id
            variant {
              id
              title 
              price
              inventoryQuantity
              image {
                url
              }
              product {
                id
                title
                handle
              }
            }
          }
          shop {
            currencyCode
            primaryDomain {
                url
            }
          }
        }`,
      { variables: { id: `gid://shopify/InventoryItem/${inventoryItemId}` } },
    );

    const result = await response?.json();

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

    console.log("Extracted Data:", extractedData);

    const notificationRequests = await getNotificationRequests(
      product.id,
      variant.id,
    );

    console.log("VARIANT: ", variant);
    console.log("PRODUCT: ", product);
    console.log("NOTIFICATION REQUESTS: ", notificationRequests);

    if (notificationRequests.length && Number(variant.inventoryQuantity) > 0) {
      await sendNotification(notificationRequests, extractedData);
    }

    return extractedData;
  } catch (fatal) {
    console.error("Fatal worker error:", fatal);
    throw fatal;
  }
}

async function getNotificationRequests(productId, variantId) {
  const notificationRequests = await db.InventoryNotificationRequest.findMany({
    where: {
      variantId,
      productId,
      status: "PENDING",
    },
  });
  return notificationRequests;
}
async function sendNotification(notificationRequests, data) {
  const ids = notificationRequests.map((nr) => nr.id);

  await sendMail(notificationRequests, data);

  await db.inventoryNotificationRequest.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      status: "COMPLETED",
    },
  });
}

async function sendMail(notificationRequests, data) {
  const templatePath = path.join(process.cwd(), "app/templates/inventory.html");
  const template = await fs.readFile(templatePath, "utf-8");

  await Promise.all(
    notificationRequests.map(async ({ name, email }) => {
      const replacements = {
        name: name,
        productName: data.productName,
        variantName: data.variantName,
        variantPrice: `${data.variantCurrency === "USD" ? "$" : "₹"} ${data.variantPrice}`,
        variantImageUrl: data.variantImageUrl,
        ctaUrl: data.ctaUrl,
        year: new Date().getFullYear(),
      };

      let html = template;
      for (const [key, value] of Object.entries(replacements)) {
        html = html.replaceAll(`{{${key}}}`, value ?? "");
      }

      await mailer.sendMail({
        from: `"Anand Max Store" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `${data.productName} is back in stock 🚀`,
        html,
      });
      console.log(`MAIL SEND TO ${name} at ${email}`);
    }),
  );
}
