import React, { useState } from 'react';
import { Building, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AddressForm } from '../../../components/modals/AddressForm';
import { updateBillingAddress } from '../../../services/api';
import { storage } from '../../../utils/storage';
import type { BillingAddressResponse } from '../../../types/orders';

interface BillingAddressSectionProps {
  orderId: string;
  billingAddress: BillingAddressResponse;
  onAddressUpdate?: () => void;
}

export function BillingAddressSection({ 
  orderId, 
  billingAddress, 
  onAddressUpdate 
}: BillingAddressSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddressSubmit = async (data: any) => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error('User data not found');
      }

      const response = await updateBillingAddress({
        orderId,
        billingAddress: data.street,
        billingCityName: data.city,
        billingStateName: data.stateCode, // Use state code for API
        billingStateCode: data.stateCode,
        billingCountry: 'US',
        billingZipCode: data.zipCode,
        userId: userData.userId
      });

      if (response.status !== 1) {
        throw new Error(response.message || 'Failed to update billing address');
      }

      setSuccess('Billing address updated successfully');

      // Wait a moment to show success message before closing
      setTimeout(() => {
        setIsModalOpen(false);
        if (onAddressUpdate) {
          onAddressUpdate();
        }
      }, 1500);
    } catch (error: any) {
      console.error('Billing address update error:', error);
      setError(error.message || 'Failed to update billing address');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50">
              <Building className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsModalOpen(true);
            }}
            className="p-1.5"
            title="Edit Billing Address"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </Button>
        </div>

        <div className="space-y-1 text-gray-600">
          <p>{billingAddress.billing_address}</p>
          <p>{billingAddress.billing_city_name}, {billingAddress.billing_state_name} {billingAddress.billing_postcode}</p>
          <p>{billingAddress.billing_country}</p>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
          onSubmit={handleAddressSubmit}
          onCancel={() => setIsModalOpen(false)}
          type="billing"
          initialData={{
            street: billingAddress.billing_address,
            city: billingAddress.billing_city_name,
            state: billingAddress.billing_state_name,
            zipCode: billingAddress.billing_postcode
          }}
          isSubmitting={isUpdating}
        />
      </Modal>
    </>
  );
}