import { Form, useFetcher, useLoaderData, useNavigation } from "react-router";
import db from "../db.server";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";

// Loader: fetch all coupons from DB
export const loader = async () => {
  const coupons = await db.GiftProducts.findMany({
    where: {
      NOT: {
        status: "DELETED",
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { coupons };
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const couponId = formData.get("couponId");

  if (!couponId) {
    throw new Error("No couponId provided");
  }

  await db.GiftProducts.update({
    where: { id: Number(couponId) },
    data: { status: "DELETED" },
  });

  return { success: true };
};

export default function CouponsPage() {
  const { coupons } = useLoaderData();

  const currentTime = new Date();

  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data?.success) {
      fetcher.load("/app/coupon");
    }
  }, [fetcher.data]);

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const getCouponStatus = (expireDate, originalStatus) => {
    const expiryDate = new Date(expireDate);
    if (expiryDate < currentTime) {
      return "EXPIRED";
    }
    return originalStatus;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "EXPIRED":
        return "bg-red-50 text-red-700 border border-red-200";
      case "Used":
        return "bg-green-100 text-gray-700 border border-green-200";
      default:
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {isSubmitting && <Loader />}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gift Coupons</h1>
        <p className="text-gray-600">
          Manage and track all gift coupons in your system
        </p>
      </div>

      {/* Coupons Table */}
      {coupons.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No coupons found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coupon Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => {
                  const status = getCouponStatus(
                    coupon.expireDate,
                    coupon.status,
                  );
                  const couponMap = {
                    PENDING: "Pending",
                    EXPIRED: "Used",
                  };
                  const isExpired =
                    coupon.status === "EXPIRED" || status === "EXPIRED";
                  const couponStatus = couponMap[coupon.status];
                  const expiryDate = new Date(coupon.expireDate);

                  return (
                    <tr
                      key={coupon.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {coupon.recipientName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {coupon.recipientEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                          {coupon.couponCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {expiryDate.toLocaleDateString()}
                        </div>
                        <div
                          className={`text-xs ${isExpired ? "text-red-600" : "text-gray-500"}`}
                        >
                          {isExpired
                            ? "Expired"
                            : `in ${Math.ceil((expiryDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))} days`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(couponStatus)}`}
                        >
                          {/* {getStatusDisplay(coupon.expireDate, coupon.status)} */}
                          {couponStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(coupon.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <fetcher.Form method="post">
                          <input
                            type="hidden"
                            name="couponId"
                            value={coupon.id}
                          />

                          <button
                            type="submit"
                            disabled={fetcher.state === "submitting"}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg"
                          >
                            {fetcher.state === "submitting"
                              ? "Deleting…"
                              : "Delete"}
                          </button>
                        </fetcher.Form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Total Coupons:{" "}
                <span className="font-medium">{coupons.length}</span>
              </div>
              <div className="text-xs text-gray-400">
                Last updated:{" "}
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
