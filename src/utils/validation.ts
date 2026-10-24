import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
});

export const paymentSchema = z.object({
  cardNumber: z.string().min(16, 'Card number must be 16 digits'),
  expiryDate: z.string().min(5, 'Expiry date is required'),
  cvv: z.string().min(3, 'CVV must be at least 3 digits'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;