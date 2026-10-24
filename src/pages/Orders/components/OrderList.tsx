import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Package, Truck, ExternalLink } from "lucide-react";
import type { Order } from "../../../types/orders";
import bottel_img from "../../../assets/img/bottel_img.png";

interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  const navigate = useNavigate();

  useEffect(() => {
    console.log(orders);
  }, []);

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
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="card hover:shadow-md transition-all cursor-pointer group"
          onClick={() => navigate(`/orders/${order.id}`)}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Image Section */}
            <div className="w-full md:w-24 h-24 flex-shrink-0">
              <img
                src={order.productImage || bottel_img}
                alt={order.productName || "Product image"}
                className="w-full h-full object-contain bg-gray-50 rounded-lg"
              />
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Order #{order.id}
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="font-medium text-sm sm:text-base">
                    {format(new Date(order.date), "MMM d, yyyy")}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full self-start sm:self-auto">
                  {getStatusIcon(order.status)}
                  <span className="text-xs sm:text-sm font-medium">
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              {order.productName && (
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {order.productName}
                  </p>
                  {order.price && (
                    <p className="text-primary-600 font-medium mt-1 text-sm sm:text-base">
                      {order.price}
                    </p>
                  )}
                </div>
              )}

              {order.trackingNumber && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500">Tracking Number</p>
                  <p className="font-medium text-sm">{order.trackingNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
