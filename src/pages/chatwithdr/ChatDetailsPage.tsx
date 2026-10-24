import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { ChatSection } from "../../pages/OrderDetails/components/ChatSection";
import { OrderDetailsSkeleton } from "../../pages/OrderDetails/components/OrderDetailsSkeleton";
import { useOrder } from "../../pages/OrderDetails/hooks/useOrder";
import { useIsMobile } from "../../hooks/useIsMobile";
// import { AddressManager } from './components/AddressManager';
// import { AddressDisplay } from './components/AddressDisplay';
// import { useCartProducts } from '../../hooks/useCartProducts';
import { storage } from "../../utils/storage";

export function ChatDetailsPage() {
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
  }, []);

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error Loading Order
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => navigate("/chat")}>Return to Orders</Button>
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
              onClick={() => navigate("/chat")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="section-title">Order #{orderId}</h2>
            </div>
          </div>
        </div>

        {isLoading ? (
          <OrderDetailsSkeleton />
        ) : order ? (
          <div className="space-y-6">
            <div className="">
              {/* <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Talk to Doctor
                </h3>
              </div> */}
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
          </div>
        ) : null}
      </div>
    </>
  );
}
