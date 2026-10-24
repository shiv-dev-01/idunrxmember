import { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { CartProductSkeleton } from "./CartProductSkeleton";
import { FormModal } from "./FormModal";
import { getUserCartProductsV2 } from "../../services/api";
import { storage } from "../../utils/storage";
import { getOrderOpTestData } from "../../services/api/orders";
import type { CartProduct } from "../../types/products";

interface OrderIntakeData {
  first_name: string;
  last_name: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  therapy: string;
  stage: string;
  order_id: string;
  intake_id: string;
  unique_id: string;
  prescription_id: string | null;
  intake_form_id: string;
}

interface ApiResponse {
  status: string;
  message: string;
  data: OrderIntakeData;
}

interface CheckInFormsProps {
  onFormCompleted?: () => Promise<void>;
}

export function CheckInForms({ onFormCompleted }: CheckInFormsProps) {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "error" | "success";
    message: string;
  } | null>(null);
  const [loadingButtons, setLoadingButtons] = useState<Set<string>>(new Set());
  const [userStateData, setUserStateData] = useState<{
    stateName: string;
    stateCode: string;
  }>({ stateName: "", stateCode: "" });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    formUrl: string;
    orderId: string;
    productId: number;
    productName: string;
    productCategoryName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    stateName?: string;
    stateCode?: string;
    intakeFormId?: string;
    uniqueId?: string;
  }>({
    isOpen: false,
    formUrl: "",
    orderId: "",
    productId: 0,
    productName: "",
    productCategoryName: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    stateName: "",
    stateCode: "",
    intakeFormId: "",
    uniqueId: "",
  });

  const fetchCheckInForms = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      }

      const userData = storage.getUserData();
      if (!userData?.email) {
        throw new Error("User data not found");
      }

      const response = await getUserCartProductsV2(userData.email);

      if (response.status === 1 && Array.isArray(response.product)) {
        // Extract state data from the first product (assuming all products have the same state)
        if (response.product.length > 0) {
          const firstProduct = response.product[0];
          setUserStateData({
            stateName: firstProduct.state_name || "",
            stateCode: firstProduct.state_code || "",
          });
        }

        // Filter products that need intake forms based on stage and form URL availability
        const formsToComplete = response.product.filter((product) => {
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
        });

        setProducts(formsToComplete);
      } else {
        setProducts([]);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to fetch check-in forms:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch forms");
    } finally {
      setIsLoading(false);
      if (showRefreshing) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchCheckInForms();
  }, []);

  // Intake / order-op data via panel token API
  const getOrderIntakeData = async (
    orderId: string
  ): Promise<OrderIntakeData | null> => {
    try {
      console.log(`Calling intake API for order: ${orderId}`);

      const userEmail = storage.getUserData()?.email;
      if (!userEmail) {
        throw new Error("User email not found");
      }

      const data = (await getOrderOpTestData(
        orderId,
        userEmail
      )) as unknown as ApiResponse;

      console.log(`Intake API response for order ${orderId}:`, data);

      if (data.status === "success") {
        // Check if the message indicates order not found
        if (
          data.message &&
          data.message.toLowerCase().includes("can't find order")
        ) {
          console.log(`Order ${orderId} not ready yet: ${data.message}`);
          throw new Error("ORDER_NOT_READY");
        }

        // Check if intake_id is null
        if (data.data && data.data.intake_form_id === null) {
          console.log(
            `Intake not found for order ${orderId}: intake_form_id is null`
          );
          throw new Error("INTAKE_NOT_FOUND");
        }

        console.log(`Successfully got intake data for order ${orderId}`);
        return data.data;
      } else {
        console.error(
          `API returned error status: ${data.status}, message: ${data.message}`
        );
        throw new Error(data.message || "Failed to fetch intake data");
      }
    } catch (error) {
      console.error(`Failed to get intake data for order ${orderId}:`, error);
      console.error(`Error details:`, error);
      return null;
    }
  };

  // Helper functions for managing button loading state
  const setButtonLoading = (orderId: string, loading: boolean) => {
    setLoadingButtons((prev) => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const isButtonLoading = (orderId: string) => {
    return loadingButtons.has(orderId);
  };

  // Helper function to check if button should be disabled
  const isFormButtonDisabled = (product: CartProduct) => {
    // If stage is not RECORDED or NEW and form_url_new is null, disable the button
    if (
      product.stage !== "RECORDED" &&
      product.stage !== "NEW" &&
      !product.form_url_new
    ) {
      return true;
    }
    return false;
  };

  // Helper function to check if it's a check-in (form_url_new exists and therapy_group is CHECKIN)
  const isCheckIn = (product: CartProduct) => {
    return !!product.form_url_new && product.therapy_group === "CHECKIN";
  };

  const handleFormClick = async (product: CartProduct) => {
    // Set button loading state
    setButtonLoading(product.order_id, true);

    try {
      console.log("handleFormClick called with product:", product);
      console.log("Product order_id:", product.order_id);
      console.log("Product stage:", product.stage);

      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error("User data not found");
      }

      console.log("User data:", userData);

      // Determine which form URL to use based on stage
      let baseFormUrl: string | null = null;

      if (product.stage === "RECORDED" || product.stage === "NEW") {
        // Use form_url when stage is RECORDED or NEW
        baseFormUrl = product.form_url || null;
        console.log(
          `✅ Stage is ${product.stage} - Using form_url:`,
          baseFormUrl
        );
      } else {
        // Use form_url_new when stage is not RECORDED or NEW
        baseFormUrl = product.form_url_new || null;
        console.log(
          "✅ Stage is not RECORDED or NEW - Using form_url_new:",
          baseFormUrl
        );

        // If form_url_new is null, show message and return
        if (!baseFormUrl) {
          console.log("❌ form_url_new is null - Cannot open form");
          setNotification({
            type: "info",
            message:
              "Please wait for the next check-in. Your form will be available soon.",
          });
          setTimeout(() => setNotification(null), 8000);
          return;
        }
      }

      if (!baseFormUrl) {
        throw new Error("Form URL not available");
      }

      // Call the new API to get intake_form_id and unique_id (for other purposes)
      let intakeData: OrderIntakeData | null = null;
      try {
        intakeData = await getOrderIntakeData(product.order_id);
      } catch (error) {
        console.warn(
          "Failed to get intake data, continuing with form URL from product:",
          error
        );
        // Continue even if intake data fails, we have the form URL
      }

      // Use user data from storage and state data from cart products API
      // Use intake_form_id and unique_id from the new API if available, otherwise use form_id from product
      const modalData = {
        isOpen: true,
        formUrl: baseFormUrl,
        orderId: product.order_id,
        productId: product.product_id,
        productName: product.product_name,
        productCategoryName: product.product_category_name,
        email: userData.email || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phoneNumber: userData.phoneNumber || "",
        stateName: userStateData.stateName,
        stateCode: userStateData.stateCode,
        intakeFormId:
          intakeData?.intake_form_id ||
          product.form_id ||
          product.form_id_new ||
          "",
        uniqueId: intakeData?.unique_id || "",
      };

      console.log("Using intake data from new API:", intakeData);
      console.log("Final form URL:", baseFormUrl);
      console.log("Modal data being set:", modalData);
      setModalState(modalData);
    } catch (error) {
      console.error("Failed to open form:", error);

      // Check if it's the specific "order not ready" error
      if (error instanceof Error && error.message === "ORDER_NOT_READY") {
        setNotification({
          type: "info",
          message:
            "Your order is being processed. Please wait 5-10 minutes and try again.",
        });
        setTimeout(() => setNotification(null), 8000);
      } else if (
        error instanceof Error &&
        error.message === "INTAKE_NOT_FOUND"
      ) {
        setNotification({
          type: "info",
          message: "Intake not found, please wait some time and try again.",
        });
        setTimeout(() => setNotification(null), 8000);
      } else {
        setNotification({
          type: "error",
          message: "Unable to load form. Please try after some time.",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } finally {
      // Always clear loading state
      setButtonLoading(product.order_id, false);
    }
  };

  const closeModal = async () => {
    setModalState({
      isOpen: false,
      formUrl: "",
      orderId: "",
      productId: 0,
      productName: "",
      productCategoryName: "",
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      stateName: "",
      stateCode: "",
      intakeFormId: "",
      uniqueId: "",
    });

    // Refresh the forms data after closing modal
    await fetchCheckInForms(true);

    // Refresh CartProducts component
    if (onFormCompleted) {
      await onFormCompleted();
    }
  };

  const handleFormCompleted = async () => {
    console.log("Form completed, refreshing data...");
    await fetchCheckInForms(true);

    // Refresh CartProducts component
    if (onFormCompleted) {
      await onFormCompleted();
    }
  };

  const handleManualRefresh = () => {
    fetchCheckInForms(true);
  };

  if (isLoading) {
    return <CartProductSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-4 sm:p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6 px-2">
            {error}
          </p>
          <Button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchCheckInForms();
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-2 text-sm sm:text-base"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Hide the entire section when no forms are needed
  }

  return (
    <>
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-2 right-2 left-2 sm:left-auto sm:top-4 sm:right-4 z-50 max-w-md sm:max-w-md mx-auto sm:mx-0 p-3 sm:p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === "info"
              ? "bg-blue-50 border-blue-400 text-blue-800"
              : notification.type === "success"
              ? "bg-green-50 border-green-400 text-green-800"
              : "bg-red-50 border-red-400 text-red-800"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === "info" && (
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {notification.type === "success" && (
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {notification.type === "error" && (
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setNotification(null)}
                className={`inline-flex ${
                  notification.type === "info"
                    ? "text-blue-400 hover:text-blue-600"
                    : notification.type === "success"
                    ? "text-green-400 hover:text-green-600"
                    : "text-red-400 hover:text-red-600"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              Action Required
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm">
              Complete these medical intakes to proceed with your medication
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-xs sm:text-sm"
              variant="secondary"
              size="sm"
            >
              <RotateCcw
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Updating..." : "Refresh"}
              </span>
              <span className="sm:hidden">{isRefreshing ? "..." : "↻"}</span>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-50 border border-amber-200 rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span className="text-amber-700 text-xs sm:text-sm font-medium">
                {products.length} pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid gap-3 sm:gap-4">
        {products.map((product) => (
          <div
            key={`${product.order_id}-${product.product_id}`}
            className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left Content */}
                <div className="flex-1 min-w-0 sm:pr-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-xs">
                        {isCheckIn(product)
                          ? "Check-in Required"
                          : "Intake Required"}
                      </span>
                    </span>
                    <span className="text-gray-400 text-xs">
                      Order #{product.order_id}
                    </span>
                  </div>

                  {/* Product Info */}
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 group-hover:text-primary-700 transition-colors break-words">
                    {product.product_name}
                  </h3>

                  {/* Category Tag */}
                  <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                      {product.product_category_name}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-blue-800 text-xs sm:text-sm font-medium">
                        Medical Information Required
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        Please complete your health assessment to proceed safely
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex flex-col sm:flex-col items-stretch sm:items-end gap-3 sm:flex-shrink-0">
                  {isFormButtonDisabled(product) ? (
                    <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                      <Button
                        disabled={true}
                        className="bg-gray-300 cursor-not-allowed text-gray-500 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base"
                      >
                        <span className="hidden sm:inline">
                          {isCheckIn(product)
                            ? "Refill my medication"
                            : "Complete Medical Intake"}
                        </span>
                        <span className="sm:hidden">
                          {isCheckIn(product) ? "Refill" : "Complete Intake"}
                        </span>
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      </Button>
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-amber-600 font-medium">
                          Waiting for next check-in
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Form will be available soon
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleFormClick(product)}
                        disabled={isButtonLoading(product.order_id)}
                        className={`${
                          isButtonLoading(product.order_id)
                            ? "bg-primary-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700 sm:group-hover:scale-105"
                        } text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base`}
                      >
                        {isButtonLoading(product.order_id) ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span className="text-sm sm:text-base">
                              Loading...
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">
                              {isCheckIn(product)
                                ? "Refill my medication"
                                : "Complete Medical Intake"}
                            </span>
                            <span className="sm:hidden">
                              {isCheckIn(product)
                                ? "Refill"
                                : "Complete Intake"}
                            </span>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </>
                        )}
                      </Button>

                      {/* Time indicator */}
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-gray-500">
                          Takes ~5 minutes
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Info Card */}
      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">
              Why do I need to complete these forms?
            </h4>
            <p className="text-blue-800 text-xs sm:text-sm leading-relaxed">
              These medical intakes help our medical team ensure your treatment
              is safe and effective. Your responses are kept confidential and
              help us provide the best possible care.
            </p>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        formUrl={modalState.formUrl}
        orderId={modalState.orderId}
        productId={modalState.productId}
        productName={modalState.productName}
        productCategoryName={modalState.productCategoryName}
        onFormCompleted={handleFormCompleted}
        email={modalState.email}
        firstName={modalState.firstName}
        lastName={modalState.lastName}
        phoneNumber={modalState.phoneNumber}
        stateName={modalState.stateName}
        stateCode={modalState.stateCode}
        intakeFormId={modalState.intakeFormId}
        uniqueId={modalState.uniqueId}
      />
    </>
  );
}
