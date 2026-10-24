import React, { useState } from 'react';
import { AddressDisplay } from './AddressDisplay';
import { AddressModals } from './AddressModals';
import { updateShippingAddress, updateBillingAddress } from '../../../services/api';
import { storage } from '../../../utils/storage';
import type { BillingAddressResponse } from '../../../types/orders';

interface AddressManagerProps {
  orderId: string;
  billingAddress: BillingAddressResponse;
  onAddressUpdate?: () => void;
}

export function AddressManager({ orderId, billingAddress, onAddressUpdate }: AddressManagerProps) {
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
        const response = await updateShippingAddress({
          orderId,
          address: data.street,
          cityName: data.city,
          stateName: data.stateCode,
          userId: userData.userId,
          zipCode: data.zipCode,
        });

        if (response.status !== 1) {
          throw new Error(response.message || 'Failed to update shipping address');
        }

        setSuccess('Shipping address updated successfully');
      } else {
        const response = await updateBillingAddress({
          orderId,
          billingAddress: data.street,
          billingCityName: data.city,
          billingStateName: data.stateCode,
          billingStateCode: data.stateCode,
          billingCountry: 'US',
          billingZipCode: data.zipCode,
          userId: userData.userId
        });

        if (response.status !== 1) {
          throw new Error(response.message || 'Failed to update billing address');
        }

        setSuccess('Billing address updated successfully');
      }

      setTimeout(() => {
        setActiveModal(null);
        if (onAddressUpdate) {
          onAddressUpdate();
        }
      }, 1500);
    } catch (error: any) {
      console.error('Address update error:', error);
      setError(error.message || `Failed to update ${type} address`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <AddressDisplay
        billingAddress={billingAddress}
        onEditShipping={() => {
          setError(null);
          setSuccess(null);
          setActiveModal('shipping');
        }}
        onEditBilling={() => {
          setError(null);
          setSuccess(null);
          setActiveModal('billing');
        }}
      />

      <AddressModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onSubmit={handleAddressSubmit}
        billingAddress={billingAddress}
        isUpdating={isUpdating}
        error={error}
        success={success}
      />
    </>
  );
}