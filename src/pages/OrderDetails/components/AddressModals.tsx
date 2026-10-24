import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { AddressForm } from '../../../components/modals/AddressForm';
import type { BillingAddressResponse } from '../../../types/orders';

interface AddressModalsProps {
  activeModal: 'shipping' | 'billing' | null;
  onClose: () => void;
  onSubmit: (data: any, type: 'shipping' | 'billing') => Promise<void>;
  billingAddress: BillingAddressResponse;
  isUpdating: boolean;
  error: string | null;
  success: string | null;
}

export function AddressModals({
  activeModal,
  onClose,
  onSubmit,
  billingAddress,
  isUpdating,
  error,
  success
}: AddressModalsProps) {
  return (
    <>
      <Modal
        isOpen={activeModal === 'shipping'}
        onClose={onClose}
        title="Update Delivery Address"
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
          onSubmit={(data) => onSubmit(data, 'shipping')}
          onCancel={onClose}
          type="shipping"
          initialData={{
            street: billingAddress.shipping_address,
            city: billingAddress.shipping_city,
            state: billingAddress.shipping_state,
            zipCode: billingAddress.shipping_postcode,
            phone: billingAddress.phone,
            email: billingAddress.email
          }}
          isSubmitting={isUpdating}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'billing'}
        onClose={onClose}
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
          onSubmit={(data) => onSubmit(data, 'billing')}
          onCancel={onClose}
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