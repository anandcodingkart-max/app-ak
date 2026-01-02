import { unauthenticated } from "../../shopify.server";
import { Order } from "../../services";

export async function processOrderController(shop, payload) {
  const { admin } = await unauthenticated.admin(shop);

  const lineItems = payload.line_items || [];
  if (!lineItems.length) return true;
  let data;

  console.log("LINE ITEMS: ", lineItems);

  for (const item of lineItems) {
    const blendProperty = item.properties?.find((p) => p.name === "Blend");
    if (blendProperty) {
      data = await new Order().processOrderSwap(
        admin,
        payload,
        item,
        blendProperty,
      );
    }
    const giftProperty = item.properties?.find((p) => p.name === "giftProduct");
    if (giftProperty) {
      await new Order().addGiftProduct(admin, item);
    }
    const couponCode = item.properties?.find((p) => p.name === "couponCode");
    console.log("COUPON CODE: ", couponCode);
    if (couponCode) {
      await new Order().expireCoupon(item);
    }
  }
  return data ?? {};
}
