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
  console.log("Webhook triggered");

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
  let { name, email, variantId, productId } = body;
  productId = `gid://shopify/Product/${productId}`;
  variantId = `gid://shopify/ProductVariant/${variantId}`;

  console.log("BODY: ", body);
  console.log("PRODUCT ID: ", productId);
  console.log("VARIANT ID: ", variantId);

  const isSubscribed = await db.InventoryNotificationRequest.findFirst({
    where: {
      email,
      variantId,
      productId,
      status: "PENDING",
    },
  });

  console.log("IS SUBSCRIBED: ", isSubscribed);

  if (!isSubscribed) {
    console.log("NOT SUBSCRIBED");
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
