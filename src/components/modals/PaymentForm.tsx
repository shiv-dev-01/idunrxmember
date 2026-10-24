```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { formatCardNumber, formatExpiryDate } from '../../utils/payment';

const paymentSchema = z.object({
  cardNumber: z.string()
    .min(16, 'Card number must be 16 digits')
    .max(16, 'Card number must be 16 digits')
    .regex(/^\d+$/, 'Card number must contain only digits'),
  expiryDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Expiry date must be in MM/YY format'),
  cvv: z.string()
    .min(3, 'CVV must be 3-4 digits')
    .max(4, 'CVV cannot be more than 4 digits')
    .regex(/^\d+$/, 'CVV must contain only digits'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  isDisabled?: boolean;
}

export function PaymentForm({ onSubmit, onCancel, isDisabled }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const cardNumber = watch('cardNumber', '');
  const expiryDate = watch('expiryDate', '');

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    setValue('cardNumber', value);
    e.target.value = formatCardNumber(value);
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setValue('expiryDate', formatExpiryDate(value));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <input
          {...register('cardNumber')}
          type="text"
          inputMode="numeric"
          onChange={handleCardNumberChange}
          value={formatCardNumber(cardNumber)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="1444 4444 4444 4444"
          autoComplete="cc-number"
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
            inputMode="numeric"
            onChange={handleExpiryDateChange}
            value={expiryDate}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="MM/YY"
            autoComplete="cc-exp"
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
            inputMode="numeric"
            maxLength={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="123"
            autoComplete="cc-csc"
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
          autoComplete="cc-name"
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
          Update Payment Method
        </Button>
      </div>
    </form>
  );
}
```