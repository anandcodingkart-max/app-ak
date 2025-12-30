import { cors } from "remix-utils/cors";
import db from "../db.server";

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  const url = new URL(request.url);
  const couponCode = url.searchParams.get("couponCode");

  if (!couponCode) {
    return cors(
      request,
      Response.json({
        success: false,
        status: 400,
        message: "Coupon code is required.",
      }),
    );
  }

  const coupon = await db.GiftProducts.findFirst({
    where: {
      couponCode,
    },
  });
  if (!coupon) {
    return cors(
      request,
      Response.json({
        success: false,
        status: 404,
        ok: false,
        message: "No coupon found",
      }),
    );
  }
  const isExpired = new Date() > new Date(coupon.expireDate);

  if (isExpired || coupon.status !== "PENDING") {
    return cors(
      request,
      Response.json({
        success: false,
        status: 410,
        ok: false,
        message: "This coupon has expired",
      }),
    );
  }

  const variantData = await getVariantData(coupon.variantId);

  return cors(
    request,
    Response.json({
      success: true,
      status: 200,
      ok: true,
      message: "success",
      variantData,
    }),
  );
}

export async function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const body = await request.json();
  console.log("BODY: ", body);

  return cors(request, Response.json({ success: true, status: 200, ok: true }));
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
