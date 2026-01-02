import { cors } from "remix-utils/cors";

export async function loader({ request }) {
  console.log("SUBSCRIPTION WEBHOOK TRIGGIRED");
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
  console.log("SUBSCRIPTION WEBHOOK BODY: ", body);

  console.log("SUBSCRIPTION PROPERTIES: ", body.items[0].properties);

  return cors(
    request,
    Response.json({
      success: true,
      status: 200,
      statusCode: 200,
      ok: true,
      message: "success",
    }),
  );
}

export async function action({ request }) {
  console.log("SUBSCRIPTION WEBHOOK TRIGGIRED");
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
  console.log("SUBSCRIPTION WEBHOOK BODY: ", body);
  console.log("SUBSCRIPTION PROPERTIES: ", body.items[0].properties);
  console.log("JSON BODY: ", JSON.stringify(body));

  return cors(request, Response.json({ success: true, status: 200, ok: true }));
}
