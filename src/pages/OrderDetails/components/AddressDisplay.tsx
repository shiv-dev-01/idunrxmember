import React from 'react';
import { MapPin, Building, Edit2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { BillingAddressResponse } from '../../../types/orders';

interface AddressDisplayProps {
  billingAddress: BillingAddressResponse;
  onEditShipping: () => void;
  onEditBilling: () => void;
}

export function AddressDisplay({ 
  billingAddress, 
  onEditShipping, 
  onEditBilling 
}: AddressDisplayProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Delivery & Billing Information</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-50">
            <MapPin className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Shipping Address</h4>
              {/* <Button
                variant="secondary"
                onClick={onEditShipping}
                className="p-1.5"
                title="Edit Shipping Address"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </Button> */}
            </div>
            <div className="mt-2 space-y-1 text-gray-600">
              <p>{billingAddress.shipping_address}</p>
              <p>{billingAddress.shipping_city}, {billingAddress.shipping_state} {billingAddress.shipping_postcode}</p>
              <p>{billingAddress.shipping_country}</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50">
            <Building className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Billing Address</h4>
              {/* <Button
                variant="secondary"
                onClick={onEditBilling}
                className="p-1.5"
                title="Edit Billing Address"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </Button> */}
            </div>
            <div className="mt-2 space-y-1 text-gray-600">
              <p>{billingAddress.billing_address}</p>
              <p>{billingAddress.billing_city_name}, {billingAddress.billing_state_name} {billingAddress.billing_postcode}</p>
              <p>{billingAddress.billing_country}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}