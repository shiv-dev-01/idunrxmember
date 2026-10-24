import { useState } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "../ui/Button";
import {
  checkCouponsV3,
  parseAppliedCoupon,
  type AppliedRefillCoupon,
} from "../../services/api/coupons";

interface RefillCouponBoxProps {
  productId: string;
  email: string;
  appliedCoupon: AppliedRefillCoupon | null;
  onApplied: (coupon: AppliedRefillCoupon) => void;
  onCleared: () => void;
}

export function RefillCouponBox({
  productId,
  email,
  appliedCoupon,
  onApplied,
  onCleared,
}: RefillCouponBoxProps) {
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const promo = code.trim();
    if (!promo) {
      setError("Enter a promo code.");
      return;
    }
    if (!email) {
      setError("Your account email is required to apply a promo code.");
      return;
    }

    setIsChecking(true);
    setError(null);
    try {
      const response = await checkCouponsV3({
        promo_codes: promo,
        product_id: productId,
        email,
      });

      if (response.status !== 1) {
        setError(response.message || "This promo code could not be applied.");
        return;
      }

      onApplied(parseAppliedCoupon(response, promo));
      setCode("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check this promo code. Please try again.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  if (appliedCoupon) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(appliedCoupon.discountAmount);

    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">
              Promo code applied
            </p>
            <p className="mt-0.5 text-sm text-green-700">
              <span className="font-mono font-semibold">{appliedCoupon.code}</span>
              {" — "}
              {formatted} off
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              onCleared();
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <label
        htmlFor={`refill-coupon-${productId}`}
        className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
      >
        <Tag className="h-4 w-4 text-gray-500" />
        Have a promo code?
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`refill-coupon-${productId}`}
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleApply();
            }
          }}
          placeholder="Enter promo code"
          autoComplete="off"
          className="form-input min-h-[40px] flex-1"
          disabled={isChecking}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleApply()}
          disabled={isChecking}
          className="sm:w-auto"
        >
          {isChecking ? "Checking..." : "Apply"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
