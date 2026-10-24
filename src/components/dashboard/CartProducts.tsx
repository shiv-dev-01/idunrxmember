import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { Package, Upload } from "lucide-react";
import { Button } from "../ui/Button";
import { CartProductSkeleton } from "./CartProductSkeleton";
import bottel_img from "../../assets/img/bottel_img.png";
import axios from "axios";
import {
  getUserCartProductsV2,
  getOrderOpTestData,
  submitIdentityRecheck,
} from "../../services/api";
import { storage } from "../../utils/storage";
import type { CartProduct } from "../../types/products";
import type { OrderOpTestResponse } from "../../types/orders";

export interface CartProductsRef {
  refresh: () => Promise<void>;
}

export const CartProducts = forwardRef<CartProductsRef>((props, ref) => {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [isOrderStatusLoading, setIsOrderStatusLoading] = useState(false);
  const [orderNeeds, setOrderNeeds] = useState([]);
  const [isOrderNeedsLoading, setIsOrderNeedsLoading] = useState(false);
  const [orderOpData, setOrderOpData] = useState<
    Record<string, OrderOpTestResponse>
  >({});
  const [isOrderOpLoading, setIsOrderOpLoading] = useState<
    Record<string, boolean>
  >({});
  const [idLast4, setIdLast4] = useState<Record<string, string>>({});
  const [isSubmittingId, setIsSubmittingId] = useState<Record<string, boolean>>(
    {}
  );
  const [idError, setIdError] = useState<Record<string, string>>({});
  const [idSuccess, setIdSuccess] = useState<Record<string, boolean>>({});
  const [showIdUpload, setShowIdUpload] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const fetchCartProducts = async () => {
    try {
      const userData = storage.getUserData();
      if (!userData?.email) {
        throw new Error("User data not found");
      }
      const response = await getUserCartProductsV2(userData.email);
      if (response.status === 1 && Array.isArray(response.product)) {
        setProducts(response.product);

        // Fetch order-op/test data for each product
        response.product.forEach((product) => {
          if (product.order_id) {
            fetchOrderOpData(product.order_id);
          }
        });

        // Fetch order status and needs for the first product
        // if (response.product[0]?.order_id) {
        //   await fetchOrderStatus(response.product[0].order_id);
        //   await fetchOrderNeeds(response.product[0].order_id);
        // }
      } else {
        setProducts([]);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to fetch cart products:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderOpData = async (orderId: string) => {
    setIsOrderOpLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const userEmail = storage.getUserData()?.email;
      if (!userEmail) {
        throw new Error("User email not found");
      }
      const response = await getOrderOpTestData(orderId, userEmail);
      if (response.status === "success" && response.data) {
        setOrderOpData((prev) => ({ ...prev, [orderId]: response }));
      }
    } catch (err) {
      console.error(`Failed to fetch order-op data for order ${orderId}:`, err);
    } finally {
      setIsOrderOpLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const hasFullBodyNeed = (orderId: string): boolean => {
    const orderData = orderOpData[orderId];
    return orderData?.data?.needs?.includes("FULLBODY") ?? false;
  };

  const hasIdNeed = (orderId: string): boolean => {
    const orderData = orderOpData[orderId];
    return orderData?.data?.needs?.includes("ID") ?? false;
  };

  const hasPreviousPrescriptionFlag = (orderId: string): boolean => {
    const orderData = orderOpData[orderId];
    // Check if PRESCRIPTION is in needs array OR previous-prescription flag is true
    const hasPrescriptionInNeeds =
      orderData?.data?.needs?.includes("PRESCRIPTION") ?? false;
    const hasPreviousPrescriptionFlag =
      orderData?.["previous-prescription"] === true;
    return hasPrescriptionInNeeds || hasPreviousPrescriptionFlag;
  };

  const handleIdLast4Change = (orderId: string, value: string) => {
    // Only allow digits and limit to 4 characters
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setIdLast4((prev) => ({ ...prev, [orderId]: digitsOnly }));
    // Clear errors when user types
    if (idError[orderId]) {
      setIdError((prev) => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    }
  };

  const handleSubmitIdLast4 = async (orderId: string) => {
    const last4 = idLast4[orderId]?.trim();
    if (!last4 || last4.length !== 4) {
      setIdError((prev) => ({
        ...prev,
        [orderId]: "Please enter 4 digits",
      }));
      return;
    }

    try {
      setIsSubmittingId((prev) => ({ ...prev, [orderId]: true }));
      setIdError((prev) => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
      setIdSuccess((prev) => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });

      const response = await submitIdentityRecheck(orderId, last4);

      if (response.status === "success") {
        setIdSuccess((prev) => ({ ...prev, [orderId]: true }));
        // Optionally refresh the order data
        setTimeout(() => {
          fetchOrderOpData(orderId);
        }, 1000);
      } else {
        setIdError((prev) => ({
          ...prev,
          [orderId]: response.message || "Submission failed",
        }));
      }
    } catch (error: any) {
      console.error("Identity recheck error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to submit ID";
      setIdError((prev) => ({
        ...prev,
        [orderId]: errorMessage,
      }));
      // Show upload option when there's an error
      setShowIdUpload((prev) => ({ ...prev, [orderId]: true }));
    } finally {
      setIsSubmittingId((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUploadIdImage = async (orderId: string) => {
    // Navigate to upload page with a query parameter to indicate it's for ID
    navigate(`/upload-image/${orderId}?type=ID`);
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      setIsLoading(true);
      await fetchCartProducts();
    },
  }));

  const fetchOrderStatus = async (order_id: string) => {
    setIsOrderStatusLoading(true);
    try {
      const res = await axios.get(
        `https://phan-dev.whitelabelmd.com/client/site/314/order-status/${order_id}`
      );
      if (res.data.status === "success") {
        setOrderStatus(res.data.data.stage);
      }
    } catch (err) {
      console.error("Error fetching order status:", err);
    } finally {
      setIsOrderStatusLoading(false);
    }
  };

  const fetchOrderNeeds = async (order_id: string) => {
    setIsOrderNeedsLoading(true);
    try {
      const res = await axios.get(
        `https://phan-dev.whitelabelmd.com/client/site/314/order/${order_id}/needs`
      );
      if (res.data.status === "success") {
        setOrderNeeds(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching order needs:", err);
    } finally {
      setIsOrderNeedsLoading(false);
    }
  };

  useEffect(() => {
    fetchCartProducts();
  }, []);

  // Helper function to check if form needs to be completed
  const needsFormCompletion = (product: CartProduct): boolean => {
    // If stage is RECORDED or NEW, show if form_url exists
    // if (product.stage === "RECORDED" || product.stage === "NEW") {
    //   return !!product.form_url;
    // }
    // If stage is not RECORDED or NEW, show if form_url_new exists and is not null
    if (
      product.stage &&
      product.stage !== "RECORDED" &&
      product.stage !== "NEW"
    ) {
      return !!product.form_url_new;
    }
    // Fallback: if no stage is set, use old logic (is_sub === 0) for backward compatibility
    return product.is_sub === 0;
  };

  // Helper function to check if it's a check-in (form_url_new exists and therapy_group is CHECKIN)
  const isCheckIn = (product: CartProduct): boolean => {
    return !!product.form_url_new && product.therapy_group === "CHECKIN";
  };

  // Helper function to get form status text and color
  const getFormStatus = (
    product: CartProduct
  ): { text: string; color: string } => {
    if (needsFormCompletion(product)) {
      if (isCheckIn(product)) {
        return {
          text: "Check-in Required",
          color: "text-yellow-600 font-medium",
        };
      }
      return { text: "Form Pending", color: "text-yellow-600 font-medium" };
    }

    // Check if form is being generated (is_sub === 2)
    if (product.is_sub === 2) {
      return {
        text: "Generating the intake form",
        color: "text-blue-600 font-medium",
      };
    }

    // Form is completed
    return { text: "Form Completed", color: "text-green-600 font-medium" };
  };

  const isLoadingAnyOrderOp = Object.values(isOrderOpLoading).some(
    (loading) => loading
  );

  if (isLoading || isOrderStatusLoading || isOrderNeedsLoading) {
    return <CartProductSkeleton />;
  }

  if (error) {
    return (
      <div className="card text-center py-8">
        <Package className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Products
        </h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="card text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Products Found
        </h3>
        <p className="text-gray-500">
          You haven't added any products to your cart yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
          <h3 className="text-lg font-medium text-gray-900">Your Products</h3>
          <Button
            variant="secondary"
            onClick={() => navigate("/orders")}
            className="w-full sm:w-auto"
          >
            View All Orders
          </Button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {products.map((product) => (
            <div
              key={`${product.order_id}-${product.product_id}`}
              className="pb-4 sm:pb-6 border-b last:border-0 last:pb-0"
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <img
                  src={product.product_img || bottel_img}
                  alt={product.product_name}
                  className="w-20 h-20 sm:w-20 sm:h-20 object-contain bg-gray-50 rounded-lg flex-shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex-1 min-w-0 w-full">
                  <h4 className="font-medium text-gray-900 mb-1 text-base sm:text-lg">
                    {product.product_name}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                    {product.product_description}
                  </p>
                  <p className="text-primary-500 font-medium text-base sm:text-lg mt-1">
                    ${product.product_price}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                    <span className="whitespace-nowrap">
                      Order #{product.order_id}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="whitespace-nowrap">
                      {product.product_category_name}
                    </span>
                    {product.form_url && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span
                          className={`whitespace-nowrap ${
                            product.is_sub === 0
                              ? "text-yellow-600 font-medium"
                              : product.is_sub === 2
                              ? "text-blue-600 font-medium"
                              : "text-green-600 font-medium"
                          }`}
                        >
                          {product.is_sub === 0
                            ? "Form Pending"
                            : product.is_sub === 2
                            ? "Generating the intake form"
                            : "Form Completed"}
                        </span>
                      </>
                    )}

                    {(product.form_url || product.form_url_new) && (
                      <>
                        <span>•</span>
                        <span className={getFormStatus(product).color}>
                          {getFormStatus(product).text}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Full Body Upload Option */}
              {hasFullBodyNeed(product.order_id) && (
                <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Full Body Image Required
                      </p>
                      <p className="text-xs sm:text-sm text-blue-700">
                        Please upload a full body image to complete your order.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        navigate(`/upload-image/${product.order_id}`)
                      }
                      className="w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              )}
              {/* Prescription Upload Option - Always Shown */}
              {(() => {
                const hasPreviousPrescription = hasPreviousPrescriptionFlag(
                  product.order_id
                );
                return (
                  <div
                    className={`mt-4 p-3 sm:p-4 rounded-lg ${hasPreviousPrescription
                        ? "bg-red-50 border border-red-200"
                        : "bg-purple-50 border border-purple-200"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium mb-1 ${hasPreviousPrescription
                              ? "text-red-900"
                              : "text-purple-900"
                            }`}
                        >
                          {hasPreviousPrescription
                            ? "We need your previous prescription to process your order"
                            : "Upload a previous prescription (optional)"}
                        </p>
                        <p
                          className={`text-xs sm:text-sm ${hasPreviousPrescription
                              ? "text-red-700"
                              : "text-purple-700"
                            }`}
                        >
                          {hasPreviousPrescription
                            ? "Our system shows that you have been prescribed this medication before. To continue processing your order and begin the medical review, please upload a clear photo of your previous prescription. Ensure your name, medication name, dosage, and date are clearly visible. Processing cannot continue until this is uploaded."
                            : "Your order has been placed successfully. If you have a previous prescription or any supporting medical documents, you may upload them now. This is optional — but if you want to upload anything for the doctor's review, please do it now, before we begin processing your order."}
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          navigate(
                            `/upload-image/${product.order_id}?type=PRESCRIPTION`
                          )
                        }
                        className="w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Upload className="w-4 h-4" />
                        {hasPreviousPrescription
                          ? "Upload previous prescription"
                          : "Upload document (optional)"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
              {/* ID Verification Option */}
              {hasIdNeed(product.order_id) && (
                <div className="mt-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        ID Verification Required
                      </p>
                      <p className="text-xs sm:text-sm text-amber-700">
                        Please enter the last 4 digits of your ID to verify your
                        identity.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 w-full sm:min-w-[200px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={idLast4[product.order_id] || ""}
                          onChange={(e) =>
                            handleIdLast4Change(
                              product.order_id,
                              e.target.value
                            )
                          }
                          placeholder="Enter last 4 digits"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base sm:text-lg tracking-widest"
                          disabled={isSubmittingId[product.order_id]}
                        />
                      </div>
                      <Button
                        onClick={() => handleSubmitIdLast4(product.order_id)}
                        disabled={
                          isSubmittingId[product.order_id] ||
                          !idLast4[product.order_id] ||
                          idLast4[product.order_id]?.length !== 4
                        }
                        className="w-full sm:w-auto whitespace-nowrap"
                      >
                        {isSubmittingId[product.order_id] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                    {idError[product.order_id] && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {idError[product.order_id]}
                      </div>
                    )}
                    {idSuccess[product.order_id] && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        ID verified successfully!
                      </div>
                    )}
                    {showIdUpload[product.order_id] && (
                      <div className="mt-3 pt-3 border-t border-amber-300">
                        <p className="text-xs sm:text-sm font-medium text-amber-900 mb-2">
                          Upload ID Image Instead
                        </p>
                        <Button
                          onClick={() => handleUploadIdImage(product.order_id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload ID Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )} 
               {/* ID Verification Option */}
               {hasIdNeed(product.order_id) && (
                <div className="mt-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        SSN Verification Required
                      </p>
                      <p className="text-xs sm:text-sm text-amber-700">
                        Please enter the last 4 digits of your Social Security
                        Number to verify your identity.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 w-full sm:min-w-[200px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={idLast4[product.order_id] || ""}
                          onChange={(e) =>
                            handleIdLast4Change(
                              product.order_id,
                              e.target.value
                            )
                          }
                          placeholder="Enter last 4 digits of SSN"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base sm:text-lg tracking-widest"
                          disabled={isSubmittingId[product.order_id]}
                        />
                      </div>
                      <Button
                        onClick={() => handleSubmitIdLast4(product.order_id)}
                        disabled={
                          isSubmittingId[product.order_id] ||
                          !idLast4[product.order_id] ||
                          idLast4[product.order_id]?.length !== 4
                        }
                        className="w-full sm:w-auto whitespace-nowrap"
                      >
                        {isSubmittingId[product.order_id] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                    {idError[product.order_id] && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {idError[product.order_id]}
                      </div>
                    )}
                    {idSuccess[product.order_id] && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        Social Security Number verified successfully!
                      </div>
                    )}
                    Show ID Upload option when there's an error
                    {showIdUpload[product.order_id] && (
                      <div className="mt-3 pt-3 border-t border-amber-300">
                        <p className="text-xs sm:text-sm font-medium text-amber-900 mb-2">
                          Upload ID Image Instead
                        </p>
                        <Button
                          onClick={() => handleUploadIdImage(product.order_id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload ID Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )} 

              {/* ID Verification Option */}
              {hasIdNeed(product.order_id) && (
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="text-xs sm:text-sm font-medium text-amber-900 mb-2">
                    Upload ID Image Instead
                  </p>
                  <Button
                    onClick={() => handleUploadIdImage(product.order_id)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload ID Image
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

CartProducts.displayName = "CartProducts";
