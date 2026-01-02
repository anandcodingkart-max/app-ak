import { authenticate } from "../shopify.server";
import { cors } from "remix-utils/cors";
import { orderQueue } from "../queues/order.server";
import { verifyShopifyHmac } from "../utils/helper";
import { UNAUTHORIZED } from "../helper/status-code";

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
  console.log("ORDER WEBHOOK TRIGGERED");
  console.log("REQUEST METHOD: ", request.method);
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

  const isValidHmac = await verifyShopifyHmac(request);
  if (!isValidHmac) {
    return cors(
      request,
      Response.json({
        success: false,
        status: UNAUTHORIZED,
        message: "UNAUTHORIZED",
      }),
    );
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
