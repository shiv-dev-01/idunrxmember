import React from "react";
import { useSubscription } from "../../hooks/useSubscription";

export function SubscriptionCard() {
  const subscription = useSubscription();

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-shrink-0">
          <div className="bg-gray-50 p-4 rounded-xl">
            <img
              src={subscription.imageUrl}
              alt="idunrx"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="space-y-1 mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {subscription.productName}
            </h3>
            <p className="text-primary-500 font-medium">
              {subscription.dosage}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Order Date</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {subscription.orderDate}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Price</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {subscription.price}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Next Billing</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {subscription.nextBillingDate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
