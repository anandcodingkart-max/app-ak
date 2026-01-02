import { UNAUTHORIZED } from "../helper/status-code";
import crypto from "crypto";
import { cors } from "remix-utils/cors";
export async function getVariantData(variantId) {
  const gid = `gid://shopify/ProductVariant/${variantId}`;

  const query = `
    query getVariantDetails($id: ID!) {
      productVariant(id: $id) {
        id
        title
        price
        image {
          url
          altText
        }
        product {
          featuredImage {
            url
          }
        }
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

  let productvariantId = await findVariantIdBySelectedOptions(
    variant.selectedOptions,
  );

  productvariantId = getNumericIdFromGid(productvariantId);

  return {
    variantId: productvariantId,
    imageUrl: variant.image?.url || variant.product?.featuredImage?.url || null,
    price: variant.price,
    size: size || "N/A",
    color: color || "N/A",
  };
}

async function findVariantIdBySelectedOptions(selectedOptions) {
  const productGid = `gid://shopify/Product/8044202721373`;

  const query = `
    query getProductVariants($id: ID!) {
      product(id: $id) {
        variants(first: 100) {
          edges {
            node {
              id
              selectedOptions {
                name
                value
              }
            }
          }
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
        variables: { id: productGid },
      }),
    },
  );

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const variants = result.data.product.variants.edges;

  const normalize = (arr) =>
    arr
      .map((o) => ({
        name: o.name.toLowerCase(),
        value: o.value.toLowerCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const targetOptions = normalize(selectedOptions);

  const matchedVariant = variants.find(({ node }) => {
    const variantOptions = normalize(node.selectedOptions);

    return JSON.stringify(variantOptions) === JSON.stringify(targetOptions);
  });

  if (!matchedVariant) {
    throw new Error("No matching variant found");
  }

  return matchedVariant.node.id;
}

export async function findVariantByInventoryId(admin, inventoryItemId) {
  const response = await admin.graphql(
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
  return result;
}

function getNumericIdFromGid(gid) {
  return gid.split("/").pop();
}

export function generateCouponCode(storeName = "Anand Max Store") {
  const prefix = storeName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  const timePart = Date.now().toString().slice(-4);

  return `${prefix}-${randomPart}${timePart}`;
}

export function formatExpiryDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
export async function verifyShopifyHmac(request) {
  const shopifyHmac = request.headers.get("x-shopify-hmac-sha256");

  if (!shopifyHmac) {
    return false;
  }

  const bodyClone = request.clone();
  const rawBody = await bodyClone.text();

  const calculatedHmacDigest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8") // Ensure utf8 encoding
    .digest("base64");

  const hmacValid = crypto.timingSafeEqual(
    Buffer.from(calculatedHmacDigest, "base64"),
    Buffer.from(shopifyHmac, "base64"),
  );

  return hmacValid;
}
