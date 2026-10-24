import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { Order } from "../../../types/orders";
import bottel_img from "../../../assets/img/bottel_img.png";
import { api } from "../../../services/api/config";

interface OrderInfoProps {
  order: Order;
}

interface DoctorStatusInfo {
  dr_order_status: number;
  doctor_message: string;
}

const getDoctorStatusInfo = (status: number) => {
  switch (status) {
    case 0:
      return {
        text: "Pending Review",
        icon: Clock,
        color: "bg-yellow-50 text-yellow-600 border-yellow-100",
      };
    case 1:
      return {
        text: "Approved",
        icon: CheckCircle2,
        color: "bg-green-50 text-green-600 border-green-100",
      };
    case 2:
      return {
        text: "Rejected",
        icon: AlertCircle,
        color: "bg-red-50 text-red-600 border-red-100",
      };
    default:
      return {
        text: "Pending Review",
        icon: Clock,
        color: "bg-yellow-50 text-yellow-600 border-yellow-100",
      };
  }
};

const MainProductCard: React.FC<{
  product: NonNullable<Order["products"]>[0];
}> = ({ product }) => (
  <div className="flex items-center gap-4">
    <img
      src={product.product_img || bottel_img}
      alt={product.product_name}
      className="w-24 h-24 object-contain bg-gray-50 rounded-lg"
    />
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900">
        {product.product_name}
      </h3>
      <p className="text-gray-500">SKU: {product.sku}</p>
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-gray-700">
          <span>Price:</span>
          <span className="font-medium">${product.product_price}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Quantity:</span>
          <span className="font-medium">{product.quantity}</span>
        </div>
      </div>
    </div>
  </div>
);

const AdditionalProductCard: React.FC<{
  product: NonNullable<Order["products"]>[0];
}> = ({ product }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    <img
      src={product.product_img || bottel_img}
      alt={product.product_name}
      className="w-16 h-16 object-contain bg-white rounded"
    />
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-gray-900 truncate">
        {product.product_name}
      </h4>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">SKU: {product.sku}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">${product.product_price}</span>
          <span className="text-xs text-gray-500">x{product.quantity}</span>
        </div>
      </div>
    </div>
  </div>
);

export function OrderInfo({ order }: OrderInfoProps) {
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatusInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorStatus = async () => {
      try {
        const response = await api.get(`/order-status`, {
          params: { order_id: order.id },
        });
        setDoctorStatus({
          dr_order_status: response.data.dr_order_status,
          doctor_message: response.data.doctor_message || "",
        });
      } catch (error) {
        console.error(
          `Error fetching doctor status for order ${order.id}:`,
          error
        );
        setDoctorStatus({
          dr_order_status: 0,
          doctor_message: "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorStatus();
  }, [order.id]);

  // Handle legacy single product structure
  if (!order.products || order.products.length === 0) {
    return (
      <div className="card">
        {order?.fullorderData?.order_status == 1 && (
          <div className="flex justify-end items-center">
            <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-white-700 dark:text-red-500 border border-red-400 whitespace-nowrap">
              Subscription Cancelled
            </span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <img
            src={order.productImage || bottel_img}
            alt={order.productImage ? order.productName : "idunrx"}
            className="w-24 h-24 object-contain bg-gray-50 rounded-lg"
          />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {order.productName}
            </h3>
            <p className="text-gray-500">{order.dosage}</p>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ${order.fullorderData?.totalsBreakdown?.subtotal}
                </span>
              </div>
              {parseFloat(order.fullorderData?.totalsBreakdown?.subtotal) -
                parseFloat(order.fullorderData?.totalsBreakdown?.total) >
                0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount:</span>
                  <span className="font-medium text-red-500">
                    - $
                    {(
                      parseFloat(
                        order.fullorderData?.totalsBreakdown?.subtotal
                      ) -
                      parseFloat(order.fullorderData?.totalsBreakdown?.total)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Paid Amount:</span>
                <span className="font-medium text-green-500">
                  ${order.fullorderData?.totalsBreakdown?.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Order Date</p>
            <p className="font-medium mt-1">
              {format(new Date(order.date), "MMM d, yyyy")}
            </p>
          </div>
          {order.nextBillingDate == "0000-00-00" ? null : (
            <div>
              <p className="text-sm text-gray-500">Next Billing Date</p>
              <p className="font-medium mt-1">
                {order?.nextBillingDate
                  ? format(new Date(order?.nextBillingDate), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const mainProduct = order.products[0];
  const additionalProducts = order.products.slice(1);

  // Calculate totals using individual product prices
  const combinedSubtotal = order.products.reduce(
    (sum, product) =>
      sum + parseFloat(product.product_price) * parseInt(product.quantity),
    0
  );

  // Use the first product's totalsBreakdown for the final total since it contains the combined total
  const combinedTotal = parseFloat(
    mainProduct.totalsBreakdown?.total || mainProduct.product_price
  );

  const statusInfo = doctorStatus
    ? getDoctorStatusInfo(doctorStatus.dr_order_status)
    : getDoctorStatusInfo(0);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="card space-y-6">
      {/* Subscription Cancelled Badge */}
      {order?.fullorderData?.order_status == 1 && (
        <div className="flex justify-end items-center">
          <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg dark:bg-white-700 dark:text-red-500 border border-red-400 whitespace-nowrap">
            Subscription Cancelled
          </span>
        </div>
      )}

      {/* Doctor Status Section */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Doctor Review Status
        </h3>
        {/* {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Loading status...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full border ${statusInfo.color}`}
            >
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium">{statusInfo.text}</span>
            </div>
            {doctorStatus?.doctor_message && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Doctor's Message:</span>{" "}
                  {doctorStatus.doctor_message}
                </p>
              </div>
            )}
          </div>
        )} */}
      </div>

      {/* Main Product */}
      <MainProductCard product={mainProduct} />

      {/* Additional Products */}
      {additionalProducts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Additional Products
          </h4>
          <div className="space-y-2">
            {additionalProducts.map((product) => (
              <AdditionalProductCard
                key={product.product_id}
                product={product}
              />
            ))}
          </div>
        </div>
      )}

      {/* Combined Totals */}
      <div className="pt-4 border-t space-y-1">
        <div className="flex justify-between text-gray-700">
          <span>Combined Subtotal:</span>
          <span className="font-medium">${combinedSubtotal.toFixed(2)}</span>
        </div>

        {mainProduct.totalsBreakdown?.coupon_discount_amount &&
          parseFloat(mainProduct.totalsBreakdown.coupon_discount_amount) >
            0 && (
            <div className="flex justify-between text-gray-700">
              <span>Coupon Discount:</span>
              <span className="font-medium text-red-500">
                - $
                {parseFloat(
                  mainProduct.totalsBreakdown.coupon_discount_amount
                ).toFixed(2)}
              </span>
            </div>
          )}
        <div className="flex justify-between text-gray-700">
          <span>Total Paid:</span>
          <span className="font-medium text-green-500">
            ${combinedSubtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Order Dates */}
      <div className="pt-4 border-t grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Order Date</p>
          <p className="font-medium mt-1">
            {format(new Date(order.date), "MMM d, yyyy")}
          </p>
        </div>
        {order.nextBillingDate === "0000-00-00" ? null : (
          <div>
            <p className="text-sm text-gray-500">Next Billing Date</p>
            <p className="font-medium mt-1">
              {order.nextBillingDate
                ? format(new Date(order.nextBillingDate), "MMM d, yyyy")
                : "N/A"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
