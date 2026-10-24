import { useEffect, useRef, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import {
  stripeAppearance,
  stripePromise,
  STRIPE_PUBLISHABLE_KEY,
  validatePaymentIntentMatchesKey,
} from "../../lib/stripe";
import {
  createOrderStripe,
  createStripePaymentIntent,
} from "../../services/api/stripe";
import { storage } from "../../utils/storage";
import { logRefillPurchase } from "../../utils/refillPurchaseLogger";
import { REFILL_PENDING_ORDER_KEY } from "../../constants/refill";
import type { CartProduct } from "../../types/products";
import type { WeightLossProduct } from "../../services/api/cart";
import {
  StripeCardForm,
  type StripeCardFormHandle,
} from "../StripeCardForm";
import { Button } from "../ui/Button";
import {
  getCouponPayableAmount,
  type AppliedRefillCoupon,
} from "../../services/api/coupons";

export interface RefillStripePaymentProps {
  selectedProduct: WeightLossProduct;
  currentProduct: CartProduct;
  submitButtonLabel?: string;
  appliedCoupon?: AppliedRefillCoupon | null;
  onSuccess: (order: {
    status: number;
    message: string;
    order_id?: string;
  }) => void;
  onCancel: () => void;
}

function resolveProfile(cartProduct: CartProduct) {
  const userData = storage.getUserData();
  return {
    email: (userData?.email || cartProduct.email || "").trim(),
    first_name: (
      userData?.firstName ||
      cartProduct.first_name ||
      ""
    ).trim(),
    last_name: (userData?.lastName || cartProduct.last_name || "").trim(),
    phone: (userData?.phoneNumber || cartProduct.phone || "").replace(
      /\D/g,
      "",
    ),
    address: (cartProduct.billing_address || "").trim(),
    city_name: (cartProduct.billing_city || "").trim(),
    state_name: (
      cartProduct.billing_state ||
      cartProduct.state_code ||
      cartProduct.state_name ||
      ""
    ).trim(),
    zip_code: (cartProduct.billing_postcode || "").trim(),
  };
}

export function RefillStripePayment({
  selectedProduct,
  currentProduct,
  submitButtonLabel = "Pay",
  appliedCoupon = null,
  onSuccess,
  onCancel,
}: RefillStripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const stripeCardRef = useRef<StripeCardFormHandle>(null);

  const originalPrice = String(selectedProduct.product_price || "0");
  const payableAmount = getCouponPayableAmount(originalPrice, appliedCoupon);
  const amountCents = Math.round(payableAmount * 100);
  const payablePrice = payableAmount.toFixed(2);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        if (amountCents < 0) {
          throw new Error("Invalid product price for payment.");
        }
        if (amountCents === 0) {
          if (!cancelled) setClientSecret(null);
          return;
        }
        if (!STRIPE_PUBLISHABLE_KEY) {
          throw new Error(
            "Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY.",
          );
        }
        if (!stripePromise) {
          throw new Error("Stripe failed to initialize.");
        }

        const profile = resolveProfile(currentProduct);
        const missing: string[] = [];
        if (!profile.email) missing.push("email");
        if (!profile.first_name) missing.push("first name");
        if (!profile.last_name) missing.push("last name");
        if (!profile.phone) missing.push("phone");
        if (!profile.address) missing.push("billing street address");
        if (!profile.city_name) missing.push("billing city");
        if (!profile.state_name) missing.push("billing state");
        if (!profile.zip_code) missing.push("billing ZIP code");
        if (missing.length) {
          throw new Error(
            `Cannot pay — missing: ${missing.join(", ")}. Billing address usually comes from your order on file.`,
          );
        }

        const secret = await createStripePaymentIntent({
          ...profile,
          amountCents,
          productId: selectedProduct.product_id,
          productName: selectedProduct.product_name,
          sku: selectedProduct.product_sku,
        });
        await validatePaymentIntentMatchesKey(secret);
        if (!cancelled) setClientSecret(secret);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize Stripe payment",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [amountCents, currentProduct, selectedProduct, appliedCoupon]);

  const persistPendingAndPay = async (paymentIntentId?: string) => {
    const profile = resolveProfile(currentProduct);
    const userData = storage.getUserData();

    sessionStorage.setItem(
      REFILL_PENDING_ORDER_KEY,
      JSON.stringify({
        orderId: currentProduct.order_id,
        productId: selectedProduct.product_id,
        product_price: payablePrice,
        original_price: originalPrice,
        promo_codes: appliedCoupon?.code || null,
        campaign_id: appliedCoupon?.campaignId ?? null,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        billing_state: profile.state_name,
        state_code: currentProduct.state_code || "",
        state_name: currentProduct.state_name || profile.state_name,
        billing_postcode: profile.zip_code,
        billing_address: profile.address,
        billing_city: profile.city_name,
        phone: profile.phone,
      }),
    );

    logRefillPurchase({
      event: "create_order_member_start",
      orderId: currentProduct.order_id,
      productId: selectedProduct.product_id,
      email: profile.email,
      userId: userData?.userId != null ? String(userData.userId) : undefined,
      message: paymentIntentId
        ? `Stripe PI ${paymentIntentId}`
        : "Coupon covers full amount",
    });

    const response = await createOrderStripe({
      ...profile,
      product_id: selectedProduct.product_id,
      product_price: payablePrice,
      original_price: originalPrice,
      stripePaymentIntentId: paymentIntentId,
      parent_order: currentProduct.order_id,
      start_url: `${window.location.origin}/refills`,
      promo_codes: appliedCoupon?.code || null,
      campaign_id: appliedCoupon?.campaignId ?? null,
    });

    sessionStorage.removeItem(REFILL_PENDING_ORDER_KEY);

    logRefillPurchase({
      event: "create_order_member_success",
      orderId: currentProduct.order_id,
      productId: selectedProduct.product_id,
      email: profile.email,
      response: { newOrderId: response.order_id },
    });

    onSuccess(response);
  };

  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);
    setError(null);
    try {
      if (amountCents === 0) {
        await persistPendingAndPay();
        return;
      }

      // Persist pending before confirm in case of redirect (Klarna / wallets)
      const profile = resolveProfile(currentProduct);
      sessionStorage.setItem(
        REFILL_PENDING_ORDER_KEY,
        JSON.stringify({
          orderId: currentProduct.order_id,
          productId: selectedProduct.product_id,
          product_price: payablePrice,
          original_price: originalPrice,
          promo_codes: appliedCoupon?.code || null,
          campaign_id: appliedCoupon?.campaignId ?? null,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          billing_state: profile.state_name,
          state_code: currentProduct.state_code || "",
          state_name: currentProduct.state_name || profile.state_name,
          billing_postcode: profile.zip_code,
          billing_address: profile.address,
          billing_city: profile.city_name,
          phone: profile.phone,
        }),
      );

      const paymentIntentId = await stripeCardRef.current!.confirmPayment();
      await persistPendingAndPay(paymentIntentId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Payment failed. Please try again.";
      logRefillPurchase({
        event: "create_order_member_error",
        orderId: currentProduct.order_id,
        productId: selectedProduct.product_id,
        error: msg,
      });
      setError(msg);
    } finally {
      setIsPaying(false);
    }
  };

  if (amountCents === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">
            Promo covers this order
          </p>
          <p className="mt-1 text-sm text-green-700">
            No payment is due. Complete your order to continue.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isPaying}
            type="button"
          >
            Cancel
          </Button>
          <Button type="button" onClick={handlePay} disabled={isPaying}>
            {isPaying ? "Processing…" : "Complete order"}
          </Button>
        </div>
      </div>
    );
  }

  if (!STRIPE_PUBLISHABLE_KEY || !stripePromise) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm font-medium text-red-800">
          Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in your env
          file.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-600">Preparing secure payment...</p>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) return null;

  const returnUrl = `${window.location.origin}/refills?refill_success=1`;

  return (
    <div className="space-y-4">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: stripeAppearance,
        }}
      >
        <StripeCardForm
          ref={stripeCardRef}
          disabled={isPaying}
          returnUrl={returnUrl}
          onExpressPaymentSuccess={async (paymentIntentId) => {
            setIsPaying(true);
            try {
              await persistPendingAndPay(paymentIntentId);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Payment failed. Please try again.",
              );
              setIsPaying(false);
            }
          }}
        />
      </Elements>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isPaying}
          type="button"
        >
          Cancel
        </Button>
        <Button type="button" onClick={handlePay} disabled={isPaying}>
          {isPaying ? "Processing…" : submitButtonLabel}
        </Button>
      </div>
    </div>
  );
}
