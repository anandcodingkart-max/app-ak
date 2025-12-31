import { cors } from "remix-utils/cors";
import db from "../../db.server";

import {
  BAD_REQUEST,
  NOT_FOUND,
  OK,
  SERVER_ERROR,
} from "../../helper/status-code";
import { getVariantData } from "../../utils/helper";

class Coupon {
  async getCouponData(request) {
    try {
      const url = new URL(request.url);
      const couponCode = url.searchParams.get("couponCode");

      if (!couponCode) {
        return cors(
          request,
          Response.json({
            success: false,
            status: BAD_REQUEST,
            message: "Coupon code is required.",
          }),
        );
      }

      const coupon = await db.GiftProducts.findFirst({
        where: {
          couponCode,
          NOT: {
            status: "DELETED",
          },
        },
      });

      if (!coupon) {
        return cors(
          request,
          Response.json({
            success: false,
            status: NOT_FOUND,
            ok: false,
            message: "No coupon found",
          }),
        );
      }

      const isExpired = new Date() > new Date(coupon.expireDate);

      if (isExpired || coupon.status !== "PENDING") {
        return cors(
          request,
          Response.json({
            success: false,
            status: BAD_REQUEST,
            ok: false,
            message: "This coupon has expired",
          }),
        );
      }

      const variantData = await getVariantData(coupon.variantId);

      return cors(
        request,
        Response.json({
          success: true,
          status: OK,
          ok: true,
          message: "success",
          variantData,
        }),
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

export default Coupon;
