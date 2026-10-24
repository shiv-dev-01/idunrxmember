import axios from "axios";
import {
  getCreateOrderStripeUrl,
  getStripePaymentIntentUrl,
} from "../../lib/stripe";
import type { CreateOrderMemberResponse } from "../../types/payment";
import { normalizeCreateOrderMemberResponse } from "./payment";

export async function createStripePaymentIntent(input: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city_name: string;
  state_name: string;
  zip_code: string;
  amountCents: number;
  productId: string;
  productName?: string;
  sku?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    email: input.email.trim(),
    firstName: input.first_name.trim(),
    lastName: input.last_name.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    productName: input.productName || "Refill",
    sku: input.sku || input.productId,
    amount: input.amountCents,
    currency: "usd",
    productId: String(input.productId),
    phone: input.phone.replace(/\D/g, ""),
    address: input.address.trim(),
    city: input.city_name.trim(),
    city_name: input.city_name.trim(),
    state: input.state_name.trim(),
    state_name: input.state_name.trim(),
    zip: input.zip_code.trim(),
    zip_code: input.zip_code.trim(),
  };

  const response = await axios.post(getStripePaymentIntentUrl(), payload, {
    headers: { "Content-Type": "application/json" },
  });

  const raw = response.data as Record<string, unknown> | null;
  const data =
    raw && typeof raw === "object" && "data" in raw
      ? (raw.data as Record<string, unknown>)
      : null;
  const result =
    raw && typeof raw === "object" && "result" in raw
      ? (raw.result as Record<string, unknown>)
      : null;

  const clientSecret =
    (raw?.clientSecret as string | undefined) ??
    (raw?.client_secret as string | undefined) ??
    (data?.clientSecret as string | undefined) ??
    (data?.client_secret as string | undefined) ??
    (result?.clientSecret as string | undefined) ??
    (result?.client_secret as string | undefined);

  if (!clientSecret) {
    throw new Error(
      "Failed to create payment intent — no clientSecret returned.",
    );
  }
  return clientSecret;
}

export async function createOrderStripe(input: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city_name: string;
  state_name: string;
  zip_code: string;
  product_id: string;
  product_price: string;
  original_price?: string;
  stripePaymentIntentId?: string;
  parent_order?: string;
  start_url?: string;
  promo_codes?: string | null;
  campaign_id?: number | string | null;
}): Promise<CreateOrderMemberResponse> {
  const payable = String(input.product_price);
  const original = String(input.original_price ?? input.product_price);
  const paymentIntentId = (input.stripePaymentIntentId || "").trim();

  const orderBody: Record<string, unknown> = {
    email: input.email.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone.replace(/\D/g, ""),
    address: input.address.trim(),
    city_name: input.city_name.trim(),
    state_name: input.state_name.trim(),
    zip_code: input.zip_code.trim(),
    start_url: input.start_url || window.location.href,
    contact_details_id: "",
    promo_codes: input.promo_codes?.trim() || null,
    campaign_id: input.campaign_id ?? null,
    payment_token: paymentIntentId || "free_order",
    stripe_payment_intent_id: paymentIntentId || null,
    product_id: String(input.product_id),
    product_price: payable,
    original_price: original,
    gateway_id: "stripe",
    billing_model_id: "3",
    qty: "1",
    billingSameAsShipping: "YES",
    billing_address: input.address.trim(),
    billing_city_name: input.city_name.trim(),
    billing_state_name: input.state_name.trim(),
    billing_zip_code: input.zip_code.trim(),
  };

  if (input.parent_order) {
    orderBody.parent_order = input.parent_order;
  }

  const response = await axios.post(getCreateOrderStripeUrl(), orderBody, {
    headers: { "Content-Type": "application/json" },
  });

  const normalized = normalizeCreateOrderMemberResponse(response.data);
  if (!normalized) {
    // Fallback: extract order_id from common shapes
    const raw = response.data;
    const first = Array.isArray(raw) ? raw[0] : raw;
    const orderId =
      first && typeof first === "object"
        ? (first as { order_id?: string | number }).order_id
        : undefined;
    if (orderId != null && orderId !== "") {
      return {
        status: 1,
        message: "Success",
        order_id: String(orderId),
      };
    }
    throw new Error("Unexpected response from createOrder_stripe");
  }
  if (normalized.status !== 1 && !normalized.order_id) {
    throw new Error(normalized.message || "createOrder_stripe failed");
  }
  return normalized;
}
