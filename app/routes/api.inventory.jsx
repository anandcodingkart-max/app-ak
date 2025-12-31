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

  return cors(request, Response.json({ message: "success", status: 200 }));
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

  return cors(request, Response.json({ success: true, status: 200, ok: true }));
}
