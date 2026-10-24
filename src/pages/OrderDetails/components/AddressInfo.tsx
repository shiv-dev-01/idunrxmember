import React, { useState } from 'react';
import { MapPin, Building, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AddressForm } from '../../../components/modals/AddressForm';
import { updateShippingAddress, updateBillingAddress } from '../../../services/api';
import { storage } from '../../../utils/storage';
import { getStates } from '../../../services/locationApi';
import type { BillingAddressResponse } from '../../../types/orders';

interface AddressInfoProps {
  billingAddress: BillingAddressResponse;
  orderId: string;
  onAddressUpdate?: () => void;
}

export function AddressInfo({ billingAddress, orderId, onAddressUpdate }: AddressInfoProps) {
  const [activeModal, setActiveModal] = useState<'shipping' | 'billing' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddressSubmit = async (data: any, type: 'shipping' | 'billing') => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      
      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error('User data not found');
      }

      if (type === 'shipping') {
        let stateCode = '';
        const states = await getStates();
        const selectedState = states.find(state => state.name === data.state);
        if (!selectedState) {
          throw new Error('Invalid state selected');
        }
        stateCode = selectedState.state_code;

        const response = await updateShippingAddress({
          orderId,
          address: data.street,
          cityName: data.city,
          stateName: data.state,
          stateCode,
          userId: userData.userId,
          zipCode: data.zipCode,
        });

        if (response.status !== 1) {
          throw new Error(response.message || 'Failed to update shipping address');
        }

        setSuccess('Shipping address updated successfully');
      } else {
        let stateCode = '';
        const states = await getStates();
        const selectedState = states.find(state => state.name === data.state);
        if (!selectedState) {
          throw new Error('Invalid state selected');
        }
        stateCode = selectedState.state_code;

        const response = await updateBillingAddress({
          orderId,
          billingAddress: data.street,
          billingCityName: data.city,
          billingStateName: stateCode,
          billingCountry: 'US',
          billingZipCode: data.zipCode,
          userId: userData.userId,
        });

        if (response.status !== 1) {
          throw new Error(response.message || 'Failed to update billing address');
        }

        setSuccess('Billing address updated successfully');
      }

      // Wait a moment to show success message before closing
      setTimeout(() => {
        setActiveModal(null);
        if (onAddressUpdate) {
          onAddressUpdate();
        }
      }, 1500);
      
    } catch (error: any) {
      setError(error.message || `Failed to update ${type} address`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setActiveModal('shipping');
                  }}
                  className="p-1.5"
                  title="Edit Shipping Address"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </Button>
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setActiveModal('billing');
                  }}
                  className="p-1.5"
                  title="Edit Billing Address"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </Button>
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

      {/* Address Update Modals */}
      <Modal
        isOpen={activeModal === 'shipping'}
        onClose={() => setActiveModal(null)}
        title="Update Shipping Address"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}
        
        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, 'shipping')}
          onCancel={() => setActiveModal(null)}
          type="shipping"
          initialData={{
            street: billingAddress.shipping_address,
            city: billingAddress.shipping_city,
            state: billingAddress.shipping_state,
            zipCode: billingAddress.shipping_postcode,
          }}
          isSubmitting={isUpdating}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'billing'}
        onClose={() => setActiveModal(null)}
        title="Update Billing Address"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, 'billing')}
          onCancel={() => setActiveModal(null)}
          type="billing"
          initialData={{
            street: billingAddress.billing_address,
            city: billingAddress.billing_city_name,
            state: billingAddress.billing_state_name,
            zipCode: billingAddress.billing_postcode,
          }}
          isSubmitting={isUpdating}
        />
      </Modal>
    </>
  );
}