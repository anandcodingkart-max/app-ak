import { cors } from "remix-utils/cors";
import { OK, SERVER_ERROR } from "../../helper/status-code";
import db from "../../db.server";

class GiftProduct {
  async addGiftProduct(request) {
    try {
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
      return cors(
        request,
        Response.json({ success: true, status: OK, ok: true }),
      );
    } catch (error) {
      console.log("SERVER ERROR: ", error);
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
}
export default GiftProduct;
