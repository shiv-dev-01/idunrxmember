import React from "react";
import { MessageSquare, PackageSearch } from "lucide-react";
import { OrderList } from "../../pages/Orders/components/OrderList";
import { OrderSkeleton } from "../../pages/Orders/components/OrderSkeleton";
import { useOrders } from "../../pages/Orders/hooks/useOrders";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { OrderChatList } from "../Orders/components/OrderChatList";

export function Chatwithdoctor() {
  const { orders, isLoading, error } = useOrders();

  return (
    <>
      <LoadingBar isLoading={isLoading} />

      <div className="space-y-6">
        <div className="section-container">
          <h2 className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            Talk to Doctor
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Click on an order to view the doctor's chat.
          </p>
        </div>

        <div className="">
          {isLoading ? (
            <OrderSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <PackageSearch className="w-16 h-16 text-red-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Error Loading Orders
              </h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <PackageSearch className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Orders Found
              </h2>
              <p className="text-gray-600">
                You haven't placed any orders yet.
              </p>
            </div>
          ) : (
            <OrderChatList orders={orders} />
          )}
        </div>
      </div>
    </>
  );
}
