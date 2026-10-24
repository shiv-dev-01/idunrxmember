import axios from 'axios';
import type {
  CreateOrderMemberResponse,
  PaymentUpdateResponse,
} from '../../types/payment';
import { api } from './config';
import { storage } from '../../utils/storage';
import { getCardType } from '../../utils/payment';

/** Static fields for createOrder_member (per product requirement). */
const CREATE_ORDER_MEMBER_BILLING_SAME_AS_SHIPPING = 'YES';
const CREATE_ORDER_MEMBER_START_URL =
  (import.meta.env.VITE_REFILL_CREATE_ORDER_START_URL as string) ||
  'https://member.idunrx.com/refills';

export const updateOrderPayment = async ({
  orderId,
  creditCardNumber,
  exMonth,
  exYear,
  cvv,
}: {
  orderId: string;
  creditCardNumber: string;
  exMonth: string;
  exYear: string;
  cvv: string;
}): Promise<PaymentUpdateResponse> => {
  try {
    const email = storage.getUserData()?.email ?? '';
    const response = await api.post('/update_order_payment_token', {
      order_id: orderId,
      creditCardNumber,
      ex_month: exMonth,
      ex_year: exYear,
      CVV: cvv,
      email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/**
 * Member refill checkout: creates order with card + profile/shipping fields.
 * POST as application/x-www-form-urlencoded (PHP-style `product_id[]`).
 */
export const createOrderMember = async (input: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city_name: string;
  state_name: string;
  zip_code: string;
  card_no: string;
  ex_month: string;
  ex_year: string;
  cvv_no: string;
  card_holder_name: string;
  product_id: string;
  card_type?: string;
}): Promise<CreateOrderMemberResponse> => {
  const pan = input.card_no.replace(/\D/g, '');
  const card_type =
    input.card_type && input.card_type !== 'unknown'
      ? input.card_type
      : getCardType(pan);

  const body = new URLSearchParams();
  body.append('billingSameAsShipping', CREATE_ORDER_MEMBER_BILLING_SAME_AS_SHIPPING);
  body.append('start_url', CREATE_ORDER_MEMBER_START_URL);
  body.append('promo_codes', 'null');
  body.append('email', input.email);
  body.append('first_name', input.first_name);
  body.append('last_name', input.last_name);
  body.append('phone', input.phone);
  body.append('address', input.address);
  body.append('city_name', input.city_name);
  body.append('state_name', input.state_name);
  body.append('zip_code', input.zip_code);
  body.append('card_type', card_type);
  body.append('card_no', pan);
  body.append('ex_month', input.ex_month);
  body.append('ex_year', input.ex_year);
  body.append('cvv_no', input.cvv_no);
  body.append('card_holder_name', input.card_holder_name);
  body.append('product_id[]', input.product_id);

  try {
    const response = await api.post<unknown>(
      '/createOrder_member',
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    const normalized = normalizeCreateOrderMemberResponse(response.data);
    if (!normalized) {
      throw new Error('Unexpected response from createOrder_member');
    }
    return normalized;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const normalizedErr = normalizeCreateOrderMemberResponse(
        error.response.data,
      );
      if (normalizedErr && normalizedErr.status !== 1) {
        throw new Error(
          normalizedErr.message || 'createOrder_member failed',
        );
      }
      const d = error.response.data as { message?: string };
      throw new Error(
        typeof d?.message === 'string' ? d.message : 'createOrder_member failed',
      );
    }
    throw error;
  }
};

/**
 * Backend may return a plain object, or a one-element array, or a JSON string of either.
 */
export function normalizeCreateOrderMemberResponse(
  raw: unknown,
): CreateOrderMemberResponse | null {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    data = data[0];
  }
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const status = Number(obj.status);
  const message =
    typeof obj.message === 'string' ? obj.message : String(obj.message ?? '');
  const orderIdRaw = obj.order_id;
  const order_id =
    orderIdRaw != null && orderIdRaw !== ''
      ? String(orderIdRaw)
      : undefined;
  if (!Number.isFinite(status)) return null;
  return { status, message, order_id };
}
