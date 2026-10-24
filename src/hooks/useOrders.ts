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

      if (orderResponse.status === 1 && orderResponse.product?.[0]) {
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
          fullorderData2: orderResponse,
          trackingNumber: orderData?.trackingNumber,
          productCategoryName: orderData?.product_category_name,
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
