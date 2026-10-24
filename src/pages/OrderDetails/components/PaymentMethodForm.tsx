import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/Button';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

const cardTypes = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'American Express' },
  { id: 'discover', label: 'Discover' },
] as const;

const paymentSchema = z.object({
  cardType: z.string().min(1, 'Card type is required'),
  cardNumber: z.string()
    .min(15, 'Card number must be at least 15 digits')
    .max(16, 'Card number cannot exceed 16 digits')
    .regex(/^\d+$/, 'Card number must contain only digits'),
  expiryDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Expiry date must be in MM/YY format'),
  cvv: z.string()
    .min(3, 'CVV must be 3-4 digits')
    .max(4, 'CVV must be 3-4 digits')
    .regex(/^\d+$/, 'CVV must contain only digits'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentMethodFormProps {
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  isDisabled?: boolean;
}

export function PaymentMethodForm({ onSubmit, onCancel, isDisabled }: PaymentMethodFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="cardType"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="Card Type"
            value={field.value}
            onChange={field.onChange}
            options={cardTypes.map(type => type.label)}
            placeholder="Select card type"
            error={errors.cardType?.message}
            disabled={isDisabled}
          />
        )}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <input
          {...register('cardNumber')}
          type="text"
          maxLength={16}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="1234 5678 9012 3456"
          disabled={isDisabled}
        />
        {errors.cardNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.cardNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Expiry Date
          </label>
          <input
            {...register('expiryDate')}
            type="text"
            maxLength={5}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="MM/YY"
            disabled={isDisabled}
          />
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            CVV
          </label>
          <input
            {...register('cvv')}
            type="password"
            maxLength={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="123"
            disabled={isDisabled}
          />
          {errors.cvv && (
            <p className="mt-1 text-sm text-red-600">{errors.cvv.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cardholder Name
        </label>
        <input
          {...register('cardholderName')}
          type="text"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Enter cardholder name"
          disabled={isDisabled}
        />
        {errors.cardholderName && (
          <p className="mt-1 text-sm text-red-600">{errors.cardholderName.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="secondary" onClick={onCancel} size="md" disabled={isDisabled}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isDisabled} size="md">
          {isSubmitting ? 'Updating...' : 'Update Payment Method'}
        </Button>
      </div>
    </form>
  );
}