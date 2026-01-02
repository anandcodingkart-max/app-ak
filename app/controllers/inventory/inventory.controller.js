import { cors } from "remix-utils/cors";
import { Inventory } from "../../services";
import { SERVER_ERROR } from "../../helper/status-code";

export async function processInventoryUpdateController(shop, payload) {
  const data = await new Inventory().processInventoryUpdate(shop, payload);
  return data;
}
export async function addInventoryNotificationRequest(request) {
  try {
    const data = await new Inventory().addInventoryNotificationRequest(request);
    return data;
  } catch (error) {
    return cors(
      request,
      Response.json({
        success: false,
        status: SERVER_ERROR,
        message: "Internal Server Error. Please try again later.",
      }),
    );
  }
}
