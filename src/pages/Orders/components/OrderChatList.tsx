import React from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Package, Truck, ExternalLink } from "lucide-react";
import type { Order } from "../../../types/orders";
import bottel_img from "../../../assets/img/bottel_img.png";

interface OrderListProps {
  orders: Order[];
}

export function OrderChatList({ orders }: OrderListProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "processing":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped":
        return <Truck className="w-5 h-5 text-primary-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "processing":
        return "Order Placed";
      case "shipped":
        return "Shipped";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="card hover:shadow-md transition-all cursor-pointer group p-3 sm:p-4"
          onClick={() => navigate(`/chatdetail/${order.id}`)}
        >
          <div className="flex flex-row items-center gap-3 sm:gap-4">
            <img
              src={order.productImage || bottel_img}
              alt={order.productName || "Product image"}
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain bg-gray-50 rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                <div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <p className="text-xs sm:text-sm text-gray-500">Order #{order.id}</p>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="font-medium text-sm sm:text-base">
                    {format(new Date(order.date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 px-2 sm:px-3 py-1 rounded-full">
                  {getStatusIcon(order.status)}
                  <span className="text-xs sm:text-sm font-medium">
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
              {order.productName && (
                <div className="mt-1 sm:mt-2">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {order.productName}
                  </p>
                  {order.price && (
                    <p className="text-primary-600 font-medium mt-0.5 sm:mt-1 text-sm sm:text-base">
                      {order.price}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}