import { authenticate } from "../../shopify.server";
import { cors } from "remix-utils/cors";
import { orderQueue } from "../../queues/order.server";

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

  await orderQueue.add(
    "order-data-process",
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
