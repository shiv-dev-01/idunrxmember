import { useState, useEffect, useCallback } from "react";
import { getOrderDetails, getBillingAddress } from "../../../services/api";
import type { Order, BillingAddressResponse } from "../../../types/orders";

export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [billingAddress, setBillingAddress] =
    useState<BillingAddressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productCategoryName, setProductCategoryName] = useState<string | null>(null);

  const fetchOrderData = useCallback(async () => {
    if (!orderId) {
      setError("Order ID is required");
      setProductCategoryName("");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [orderResponse, addressResponse] = await Promise.all([
        getOrderDetails(orderId),
        getBillingAddress(orderId),
      ]);

      if (orderResponse.status === 1 && orderResponse.product?.length > 0) {
        // Transform the products array to match the new structure
        const products = orderResponse.product.map((product: any) => ({
          product_id: product.product_id,
          product_name: product.product_name,
          product_price: product.product_price,
          recurring_date: product.recurring_date,
          next_billing_date: product.next_billing_date,
          sku: product.sku,
          quantity: product.quantity,
          time_stamp: product.time_stamp,
          time: product.time,
          order_id: product.order_id,
          product_img: product.product_img,
          totalsBreakdown: {
            subtotal: product.product_price,
            total: product.product_price,
            coupon_discount_amount: product.coupon_discount_amount || "0"
          }
        }));

        const orderData = orderResponse.product[0];
        console.log("orderData", orderData);
        setOrder({
          id: orderData.order_id,
          date: orderData.time,
          status: "placed",
          productName: orderData.product_name,
          dosage: "0.25 mg/week",
          price: `$${orderData.product_price}`,
          productImage: orderData.product_img,
          nextBillingDate: orderData.next_billing_date,
          fullorderData: orderData,
          trackingNumber: orderData?.trackingNumber,
          productCategoryName: orderData?.product_category_name,
          products: products
        });
        setProductCategoryName(orderData?.product_category_name)
      }

      if (addressResponse.status === 1) {
        setBillingAddress(addressResponse);
      }

      setError(null);
    } catch (error: any) {
      console.error("Failed to fetch order data:", error);
      setError(error.message || "Failed to fetch order data");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  return { order, billingAddress, isLoading, error,productCategoryName, refetch: fetchOrderData };
}
