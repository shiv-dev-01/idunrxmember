import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { OrderInfo } from "./components/OrderInfo";
import { OrderTimeline } from "./components/OrderTimeline";
import { TrackingInfo } from "./components/TrackingInfo";
import { ChatSection } from "./components/ChatSection";
import { OrderDetailsSkeleton } from "./components/OrderDetailsSkeleton";
import { QuickActions } from "./components/QuickActions";
import { useOrder } from "./hooks/useOrder";
import { useIsMobile } from "../../hooks/useIsMobile";
import { AddressManager } from "./components/AddressManager";
import { AddressDisplay } from "./components/AddressDisplay";
import { useCartProducts } from "../../hooks/useCartProducts";
import { storage } from "../../utils/storage";
import { callOrderOpTest } from "../../services/api/orders";

export function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, billingAddress, isLoading, error, refetch } =
    useOrder(orderId);
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const productCategory = storage.getProductCategory();

  useEffect(() => {
    window.scrollTo(0, 0);
    console.log("111", order);
    console.log(
      "product_category_name",
      productCategory ? productCategory : "no order"
    );

    // Call order-op test API via panel token path
    if (orderId) {
      const email = storage.getUserData()?.email;
      callOrderOpTest(orderId, email)
        .then((response) => {
          console.log("Order-OP Test API Response:", response);
        })
        .catch((error) => {
          console.error("Order-OP Test API Error:", error);
        });
    }
  }, [orderId]);

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error Loading Order
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => navigate("/orders")}>Return to Orders</Button>
      </div>
    );
  }

  return (
    <>
      <LoadingBar isLoading={isLoading} />

      <div className="space-y-6">
        <div className="section-container flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => navigate("/orders")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="section-title">Order #{orderId}</h2>
              <p className="text-sm md:text-base text-gray-600">
                View order details and tracking information
              </p>
            </div>
          </div>

          {!isLoading && billingAddress && (
            <QuickActions
              orderId={orderId!}
              order={order}
              billingAddress={billingAddress}
              onAddressUpdate={refetch}
            />
          )}
          {/* <div>
<p className="text-sm text-gray-500">Next Checkin Link</p>
<a href={order?.fullorderData?.next_checkin_link} target='_blank' className="font-medium mt-1 text-sm break-words text-blue-600 hover:text-blue-400">
{order?.fullorderData?.next_checkin_link}              </a>
            </div> */}
        </div>

        {isLoading ? (
          <OrderDetailsSkeleton />
        ) : order ? (
          <div className="space-y-6">
            <OrderInfo order={order} />
            <AddressDisplay billingAddress={billingAddress} />
            <OrderTimeline order={order} />

            <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
              <TrackingInfo order={order} />
            </div>

            {/* Chat Section - Desktop */}
            {!isMobile && (
              <div className="section-container relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Talk to Doctor
                  </h3>
                  {/* <Button
                    variant="secondary"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2"
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </Button> */}
                </div>
                <div
                  className={`transition-all duration-300 ${
                    isFullscreen
                      ? "fixed inset-4 z-50 bg-white p-4 rounded-xl shadow-2xl"
                      : ""
                  }`}
                >
                  <ChatSection
                    orderId={orderId!}
                    productCategory={productCategory}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Mobile Chat Button & Modal */}
      {isMobile && (
        <>
          <div className="fixed bottom-6 left-6">
            <Button
              onClick={() => setShowChat(true)}
              className="shadow-lg flex items-center gap-2 px-4"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Talk to Doctor</span>
            </Button>
          </div>

          {showChat && (
            <div className="fixed inset-0 bg-white z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0">
                  <h3 className="text-lg font-medium">Talk to Doctor</h3>
                  <Button
                    variant="secondary"
                    onClick={() => setShowChat(false)}
                    className="p-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatSection
                    orderId={orderId!}
                    productCategory={productCategory}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
