import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY = import.meta.env
  .VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

/** Panel checkout API (same endpoints as idunrx_funnel__new). */
export const getStripePaymentIntentUrl = (): string => {
  const envUrl = import.meta.env.VITE_STRIPE_PAYMENT_INTENT_URL as
    | string
    | undefined;
  if (envUrl) return envUrl;
  return "https://panel.whitelabelmd.com/idunrx/api/stripe/create-payment-intent";
};

export const getCreateOrderStripeUrl = (): string => {
  const envUrl = import.meta.env.VITE_STRIPE_CREATE_ORDER_URL as
    | string
    | undefined;
  if (envUrl) return envUrl;
  return "https://panel.whitelabelmd.com/idunrx/api/createOrder_stripe";
};

export const isTestPublishableKey = () =>
  !!STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_");

export async function validatePaymentIntentMatchesKey(
  clientSecret: string,
): Promise<void> {
  const stripe = await stripePromise;
  if (!stripe || !STRIPE_PUBLISHABLE_KEY) return;

  const { paymentIntent, error } =
    await stripe.retrievePaymentIntent(clientSecret);
  if (error || !paymentIntent) return;

  const expectsLive = !isTestPublishableKey();
  if (paymentIntent.livemode !== expectsLive) {
    const hint = isTestPublishableKey()
      ? "Panel API returned a LIVE payment intent but the site uses pk_test_. Set VITE_STRIPE_PAYMENT_INTENT_URL to a test PI endpoint, or use pk_live_."
      : "Panel API returned a TEST payment intent but the site uses pk_live_.";
    throw new Error(`Stripe key mismatch. ${hint}`);
  }
}

export const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

export const stripeAppearance: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#c8ad68",
    colorBackground: "#ffffff",
    colorText: "#0f172a",
    colorDanger: "#ef4444",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "8px",
  },
  rules: {
    ".Input": { border: "1px solid #e2e8f0", padding: "12px 16px" },
    ".Input:focus": {
      border: "1px solid #c8ad68",
      boxShadow: "0 0 0 3px rgba(200,173,104,0.2)",
    },
  },
};
