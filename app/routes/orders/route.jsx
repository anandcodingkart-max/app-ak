import { shopifyApi } from "@shopify/shopify-api";
import { authenticate } from "../../shopify.server";
import { cors } from "remix-utils/cors";
import { orderQueue } from "../../queues/order.server";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;
const API_VERSION = "2025-01";

export const shopify = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  scopes: ["write_orders"],
  hostName: SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  apiVersion: API_VERSION,
  isEmbeddedApp: false,
});

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

  return cors(request, Response.json({ message: "success" }));
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

  const { payload, shop, topic } = await authenticate.webhook(request);

  if (topic === "ORDERS_CREATE") {
    await orderQueue.add(
      "swap-blend-product",
      {
        shop,
        payload,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );
  }

  return cors(request, Response.json({ success: true, status: 200 }));
}
