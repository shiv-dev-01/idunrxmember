import axios from "axios";
import { whitelabelUploadApi } from "./config";

const SITE_ID = import.meta.env.VITE_WHITELABEL_SITE_ID ?? "314";

export interface AppliedRefillCoupon {
  code: string;
  discountAmount: number;
  campaignId: number | string | null;
}

export interface CheckCouponsV3Response {
  status: number;
  message: string;
  site_id?: number;
  campaign_id?: number | string | null;
  data?: {
    code?: string;
    discount_amount?: string | number;
    products_checked?: number;
    sticky_products?: Array<{
      product_id: number | string;
      quantity: number;
    }>;
  };
}

export function getCouponPayableAmount(
  productPrice: string | number | undefined | null,
  coupon: AppliedRefillCoupon | null | undefined,
): number {
  const original = parseFloat(String(productPrice ?? "0"));
  const price = Number.isFinite(original) ? original : 0;
  const discount = coupon?.discountAmount ?? 0;
  return Math.max(0, Math.round((price - discount) * 100) / 100);
}

export async function checkCouponsV3(input: {
  promo_codes: string;
  product_id: string;
  email: string;
}): Promise<CheckCouponsV3Response> {
  const payload = {
    site_id: Number(SITE_ID) || 314,
    promo_codes: input.promo_codes.trim(),
    product_id: String(input.product_id),
    email: input.email.trim(),
  };

  try {
    const response = await whitelabelUploadApi.post<CheckCouponsV3Response>(
      "/check_coupons_v3",
      payload,
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data as CheckCouponsV3Response;
    }
    throw error;
  }
}

export function parseAppliedCoupon(
  response: CheckCouponsV3Response,
  fallbackCode: string,
): AppliedRefillCoupon {
  const discountRaw = response.data?.discount_amount;
  const discountAmount = parseFloat(String(discountRaw ?? "0"));
  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    throw new Error("Invalid discount amount returned for this promo code.");
  }

  return {
    code: String(response.data?.code || fallbackCode).trim(),
    discountAmount,
    campaignId: response.campaign_id ?? null,
  };
}
