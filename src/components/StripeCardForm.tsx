import {
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";

export interface StripeCardFormHandle {
  confirmPayment: () => Promise<string>;
}

interface Props {
  disabled?: boolean;
  /** Return URL used for redirect-based payment methods (Klarna, etc.). */
  returnUrl?: string;
  onExpressPaymentSuccess?: (paymentIntentId: string) => Promise<void>;
}

const EXPRESS_CHECKOUT_OPTIONS = {
  buttonHeight: 48,
  buttonType: {
    applePay: "buy" as const,
    googlePay: "buy" as const,
  },
  paymentMethods: {
    applePay: "auto" as const,
    googlePay: "auto" as const,
    link: "auto" as const,
    amazonPay: "auto" as const,
  },
  layout: {
    maxColumns: 2,
    maxRows: 2,
  },
};

const PAYMENT_ELEMENT_OPTIONS = {
  layout: {
    type: "accordion" as const,
    defaultCollapsed: false,
    radios: "auto" as const,
    spacedAccordionItems: true,
  },
  wallets: {
    applePay: "never" as const,
    googlePay: "never" as const,
    link: "never" as const,
  },
  paymentMethodOrder: ["card", "amazon_pay", "klarna", "link"],
};

function buildReturnUrl(fallback?: string) {
  if (fallback) return fallback;
  const url = new URL(window.location.href);
  ["payment_intent", "payment_intent_client_secret", "redirect_status"].forEach(
    (k) => url.searchParams.delete(k),
  );
  url.searchParams.set("refill_success", "1");
  return url.toString();
}

export const StripeCardForm = forwardRef<StripeCardFormHandle, Props>(
  ({ disabled, returnUrl, onExpressPaymentSuccess }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [expressAvailable, setExpressAvailable] = useState(false);

    const runConfirmPayment = useCallback(async (): Promise<string> => {
      if (!stripe || !elements) {
        throw new Error("Stripe has not loaded yet. Please try again.");
      }

      setErrorMessage(null);

      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(
          submitError.message ?? "Please check your payment details.",
        );
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: buildReturnUrl(returnUrl) },
        redirect: "if_required",
      });

      if (error) {
        throw new Error(error.message ?? "Payment failed. Please try again.");
      }

      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error(
          paymentIntent?.status
            ? `Payment status: ${paymentIntent.status}. Please try again.`
            : "Payment confirmation failed.",
        );
      }

      return paymentIntent.id;
    }, [stripe, elements, returnUrl]);

    useImperativeHandle(ref, () => ({
      confirmPayment: runConfirmPayment,
    }));

    const handleExpressConfirm = async () => {
      if (disabled || isProcessing) return;

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const paymentIntentId = await runConfirmPayment();
        if (onExpressPaymentSuccess) {
          await onExpressPaymentSuccess(paymentIntentId);
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Payment failed. Please try again.",
        );
        setIsProcessing(false);
      }
    };

    return (
      <div className="space-y-3">
        <div className="stripe-express-checkout min-h-[48px]">
          <ExpressCheckoutElement
            options={EXPRESS_CHECKOUT_OPTIONS}
            onReady={({ availablePaymentMethods }) => {
              setExpressAvailable(!!availablePaymentMethods);
            }}
            onLoadError={(event) => {
              setErrorMessage(
                event.error?.message ??
                  "Express checkout failed to load. Check Stripe key and payment intent mode.",
              );
            }}
            onClick={({ resolve }) => {
              if (disabled || isProcessing) return;
              resolve();
            }}
            onConfirm={handleExpressConfirm}
          />
        </div>

        {expressAvailable && (
          <div
            className="flex items-center gap-3 text-xs text-slate-500 my-1"
            aria-hidden="true"
          >
            <div className="flex-1 h-px bg-slate-200" />
            <span>Or pay with card</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        )}

        <PaymentElement
          options={PAYMENT_ELEMENT_OPTIONS}
          onLoadError={(event) => {
            setErrorMessage(
              event.error?.message ??
                "Payment form failed to load. Check Stripe key and payment intent mode.",
            );
          }}
        />

        {errorMessage && (
          <div className="text-red-500 text-sm mt-2 px-1">{errorMessage}</div>
        )}
      </div>
    );
  },
);

StripeCardForm.displayName = "StripeCardForm";
