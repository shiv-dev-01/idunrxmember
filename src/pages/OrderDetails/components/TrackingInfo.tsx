import React from "react";
import { ExternalLink, Truck } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { Order } from "../../../types/orders";
import { identifyCarrier } from "../../../utils/orders";

interface TrackingInfoProps {
  order: Order;
}

export function TrackingInfo({ order }: TrackingInfoProps) {
  if (!order.trackingNumber) {
    return null;
  }

  const { carrier, trackingUrl } = identifyCarrier(order.trackingNumber);

  const trackingInfo = identifyCarrier(order.trackingNumber);

  console.log("122", trackingInfo);
  // USPS

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary-50">
          <Truck className="w-5 h-5 text-primary-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Tracking Information
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Tracking Number</p>
          <p className="font-medium mt-1">{order.trackingNumber}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Carrier</p>
          <p className="font-medium mt-1">{carrier}</p>
        </div>

        {/* <Button
          as="a"
          href={getTrackingUrl("fedex", order.trackingNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mt-4"
        >
          Track Package
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button> */}
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            Track Package
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        ) : (
          <p className="text-sm text-red-500 mt-4">
            Tracking link unavailable for this carrier.
          </p>
        )}
      </div>
    </div>
  );
}