import React, { useState } from 'react';
import { CreditCard, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PaymentForm } from '../../../components/ui/PaymentForm';
import { updateOrderPayment } from '../../../services/api/payment';
import type { PaymentFormData } from '../../../types/payment';

interface PaymentInfoProps {
  orderId: string;
}

export function PaymentInfo({ orderId }: PaymentInfoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (data: PaymentFormData) => {
    try {
      setIsUpdating(true);
      setError(null);
      setIsSuccess(false);

      const [month, year] = data.expiryDate.split('/');
      
      const response = await updateOrderPayment({
        orderId,
        creditCardNumber: data.cardNumber.replace(/\s/g, ''),
        exMonth: month,
        exYear: `20${year}`,
        cvv: data.cvv,
      });

      if (response.status === 1) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setIsSuccess(false);
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to update payment method');
      }
    } catch (error: any) {
      console.error('Payment update error:', error);
      setError(error.message || 'Failed to update payment method');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <CreditCard className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setIsSuccess(false);
              setIsModalOpen(true);
            }}
            className="p-1.5"
            title="Update Payment Method"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </Button>
        </div>

        <div className="text-gray-600">
          <p>Update your payment method for future billings</p>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Payment Method"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {isSuccess && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">Payment details updated successfully!</p>
            </div>
          </div>
        )}

        <PaymentForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isDisabled={isSuccess || isUpdating}
          orderId={orderId}
        />
      </Modal>
    </>
  );
}