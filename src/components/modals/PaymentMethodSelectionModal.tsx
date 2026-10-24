import { CreditCard } from "lucide-react";
import { Button } from "../ui/Button";
import googlePayIcon from "../../assets/img/google-pay-icon.png";
import applePayIcon from "../../assets/img/apple-pay-icon.png";
import amazonPayIcon from "../../assets/img/amazon-pay-icon.png";

interface PaymentMethodSelectionModalProps {
  onSelectSameCard: () => void;
  onSelectNewCard: () => void;
  onCancel: () => void;
  /** When true, hide "Same Card" option (e.g. when product cc_type is "offline") */
  hideSameCard?: boolean;
}

export function PaymentMethodSelectionModal({
  onSelectSameCard,
  onSelectNewCard,
  onCancel,
  hideSameCard = false,
}: PaymentMethodSelectionModalProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm mb-4">
        How would you like to pay for this refill?
      </p>

      <div className="space-y-3">
        {!hideSameCard && (
          <button
            onClick={onSelectSameCard}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                  Bill with same card
                </h4>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  Use your existing payment method
                </p>
              </div>
            </div>
          </button>
        )}

        <button
          onClick={onSelectNewCard}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                Bill with new card details
              </h4>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Enter new payment information
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Google Pay Logo */}
              <img 
                src={googlePayIcon} 
                alt="Google Pay" 
                className="h-6 object-contain"
              />
              {/* Apple Pay Logo */}
              <img 
                src={applePayIcon} 
                alt="Apple Pay" 
                className="h-6 object-contain"
              />
              {/* Amazon Pay Logo */}
              <img 
                src={amazonPayIcon} 
                alt="Amazon Pay" 
                className="h-6 object-contain"
              />
            </div>
          </div>
        </button>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button onClick={onCancel} variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
