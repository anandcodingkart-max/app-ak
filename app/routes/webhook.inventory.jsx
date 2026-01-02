import { authenticate } from "../shopify.server";
import { cors } from "remix-utils/cors";
import { inventoryQueue } from "../queues/inventory.server";

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

  const { payload, shop } = await authenticate.webhook(request);

  await inventoryQueue.add(
    "update-inventory-stock",
    {
      shop,
      payload,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );

  return cors(request, Response.json({ success: true, status: 200 }));
}
