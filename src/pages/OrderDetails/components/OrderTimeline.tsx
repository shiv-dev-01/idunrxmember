import React from "react";
import { format } from "date-fns";
import { Package, Truck, CheckCircle, BaggageClaim } from "lucide-react";
import type { Order } from "../../../types/orders";

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const steps = [
    {
      status: "placed",
      title: "Order Placed",
      description: "Your order has been placed successfully",
      icon: BaggageClaim,
      iconColor: "text-primary-500",
      bgColor: "bg-primary-50",
    },
    {
      status: "processing",
      title: "Order Processing",
      description: "Your order has been received and is being processed",
      icon: Package,
      iconColor: "text-primary-500",
      bgColor: "bg-primary-50",
    },
    {
      status: "shipped",
      title: "Order Shipped",
      description: order.trackingNumber
        ? `Your order is on its way. Tracking number: ${order.trackingNumber}`
        : "Your order has been shipped",
      icon: Truck,
      iconColor: "text-green-500",
      bgColor: "bg-green-50",
    },
  ];

  const currentStepIndex = steps.findIndex(
    (step) => step.status === order.status
  );

  console.log("Order111", order.trackingNumber);

  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Order Timeline</h3>

      <div className="space-y-8">
        {steps.map((step, index) => {
          const isCompleted = order?.trackingNumber ? index <= 2 : index <= 1;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step.status}
              className="relative flex gap-4"
              style={{ marginTop: index == 1 ? 0 : "32px" }}
            >
              {index !== steps.length - 1 && (
                <div
                  className={`absolute left-6 top-8 bottom-0 w-px ${
                    isCompleted ? "bg-primary-500" : "bg-gray-200"
                  }`}
                  //
                />
              )}

              <div
                className={`
                w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                ${isCompleted ? step.bgColor : "bg-gray-50"}
              `}
              >
                <step.icon
                  className={`
                  w-6 h-6
                  ${isCompleted ? step.iconColor : "text-gray-400"}
                `}
                />
              </div>

              <div>
                <h4
                  className={`
                  font-medium
                  ${isCompleted ? "text-gray-900" : "text-gray-500"}
                `}
                >
                  {step.title}
                </h4>
                <p
                  className={`
                  text-sm mt-1
                  ${isCompleted ? "text-gray-600" : "text-gray-400"}
                `}
                >
                  {step.description}
                </p>
                {isCurrent && (
                  <p className="text-sm text-primary-500 font-medium mt-2 mb-8">
                    {format(new Date(order.date), "MMM d, yyyy h:mm a")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
