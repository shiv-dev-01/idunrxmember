import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './Button';
import { formatCardNumber, formatExpiryDate } from '../../utils/payment';

const paymentSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Card number is required')
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      // Length only: many gateways / test PANs (e.g. 1444…4440) are not Luhn-valid.
      return digits.length >= 13 && digits.length <= 19;
    }, 'Enter a valid card number (13–19 digits)'),
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
  onSubmit: (data: PaymentFormData) => void | Promise<void>;
  onCancel: () => void;
  isDisabled?: boolean;
  isSubmitting?: boolean;
  /** Primary action label (default: update payment method). */
  submitButtonLabel?: string;
  /**
   * When true, the submit button appears only after the form is valid (refill “Pay” flow).
   * When false (default), submit is always shown like before.
   */
  hideSubmitUntilValid?: boolean;
  orderId?: string;
}

export function PaymentForm({
  onSubmit,
  onCancel,
  isDisabled,
  isSubmitting,
  submitButtonLabel = 'Update Payment Method',
  hideSubmitUntilValid = false,
  orderId,
}: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
    },
  });

  const cardNumber = watch('cardNumber', '');
  const expiryDate = watch('expiryDate', '');
  /** RHF `isValid` is unreliable with controlled card/expiry + setValue; use schema on live values. */
  const formValues = watch();
  const formPassesSchema = useMemo(
    () => paymentSchema.safeParse(formValues).success,
    [formValues],
  );

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setValue('cardNumber', value, { shouldValidate: true, shouldDirty: true });
    e.target.value = formatCardNumber(value);
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setValue('expiryDate', formatExpiryDate(value), {
      shouldValidate: true,
      shouldDirty: true,
    });
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
          placeholder="1234 5678 9012 3456"
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
        <Button variant="secondary" onClick={onCancel} disabled={isDisabled || isSubmitting}>
          Cancel
        </Button>
        {hideSubmitUntilValid && !formPassesSchema ? null : (
          <Button
            type="submit"
            disabled={
              isDisabled ||
              isSubmitting ||
              (hideSubmitUntilValid && !formPassesSchema)
            }
          >
            {isSubmitting ? 'Processing…' : submitButtonLabel}
          </Button>
        )}
      </div>
    </form>
  );
}