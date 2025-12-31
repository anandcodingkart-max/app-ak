import { cors } from "remix-utils/cors";
import { SERVER_ERROR } from "../../helper/status-code";
import { GiftProduct } from "../../services";

export async function addGiftProductController(request) {
  try {
    const data = await new GiftProduct().addGiftProduct(request);
    return data;
  } catch (error) {
    return cors(
      request,
      Response.json({
        success: false,
        status: SERVER_ERROR,
        message: "Internal Server Error. Please try again later.", // Fixed typo "lator"
      }),
    );
  }
}
