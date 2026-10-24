import React, { useEffect, useState } from "react";
import { MapPin, Building, CreditCard, CheckCircle, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { AddressForm } from "../../../components/modals/AddressForm";
import { PaymentForm } from "../../../components/ui/PaymentForm";

import {
  updateShippingAddress,
  updateBillingAddress,
} from "../../../services/api";
import { updateOrderPayment } from "../../../services/api/payment";
import { storage } from "../../../utils/storage";
import { getStates } from "../../../services/locationApi";
import type { BillingAddressResponse, Order } from "../../../types/orders";
import { square } from "../../../assets/img/square-x.png";
import { updateYourCoachEligibility } from "../../../services/api/yourcoach";
import { getOrderProductSku } from "../../../utils/yourcoach-offer";
import { api } from "../../../services/api/config";

interface QuickActionsProps {
  orderId: string;
  order: Order;
  billingAddress: BillingAddressResponse;
  onAddressUpdate?: () => void;
}

type ModalType =
  | "delivery"
  | "billing"
  | "payment"
  | "confirmCancel"
  | "reasonSelection"
  | null;
export function QuickActions({
  orderId,
  order,
  billingAddress,
  onAddressUpdate,
}: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [reason, setReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddressSubmit = async (
    data: any,
    type: "delivery" | "billing"
  ) => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error("User data not found");
      }

      // Get state code
      const states = await getStates();
      const selectedState = states.find((state) => state.name === data.state);
      if (!selectedState) {
        throw new Error("Invalid state selected");
      }

      if (type === "delivery") {
        const response = await updateShippingAddress({
          orderId,
          address: data.street,
          cityName: data.city,
          stateName: selectedState.name,
          stateCode: selectedState.state_code,
          userId: userData.userId,
          zipCode: data.zipCode,
          phoneNumber: data.phone || billingAddress.phone || "",
          email: data.email || billingAddress.email || "",
        });

        if (response.status !== 1) {
          throw new Error(
            response.message || "Failed to update delivery address"
          );
        }

        setSuccess("Delivery address updated successfully");
      } else {
        const response = await updateBillingAddress({
          orderId,
          billingAddress: data.street,
          billingCityName: data.city,
          billingStateName: selectedState.name,
          billingStateCode: selectedState.state_code,
          billingCountry: "US",
          billingZipCode: data.zipCode,
          userId: userData.userId,
        });

        if (response.status !== 1) {
          throw new Error(
            response.message || "Failed to update billing address"
          );
        }

        setSuccess("Billing address updated successfully");
      }

      // Wait a moment to show success message before closing
      setTimeout(() => {
        setActiveModal(null);
        if (onAddressUpdate) {
          onAddressUpdate();
        }
      }, 1500);
    } catch (error: any) {
      setError(error.message || `Failed to update ${type} address`);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    console.log("Order110", order);
  }, []);

  const handlePaymentSubmit = async (data: any) => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      // Extract month and year from expiry date (MM/YY format)
      const [month, year] = data.expiryDate.split("/");

      const response = await updateOrderPayment({
        orderId,
        creditCardNumber: data.cardNumber.replace(/\s/g, ""),
        exMonth: month,
        exYear: year,
        cvv: data.cvv,
      });

      if (response.status === 1) {
        setSuccess("Payment method updated successfully");
        setTimeout(() => {
          setActiveModal(null);
        }, 1500);
      } else {
        throw new Error(response.message || "Failed to update payment method");
      }
    } catch (error: any) {
      setError(error.message || "Failed to update payment method");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelConfirmation = () => {
    setActiveModal("reasonSelection");
  };

  const handleCancelSubmit = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      if (!selectedOption) {
        setError("Please select a reason for cancellation.");
        return;
      }

      const payload = {
        order_id: orderId,
        // Uncomment below if you're handling custom reasons
        // reason: selectedOption === "Other" ? reason.trim() : selectedOption,
      };

      const { data: result } = await api.post("/subscription_stop", payload);

      if (result.status !== 1) {
        let customErrorMessage = result.message || "Failed to cancel renewal.";

        if (
          result.message === "Whoops, something went wrong" ||
          result?.data?.message === "Whoops, something went wrong"
        ) {
          customErrorMessage =
            "Your order is too old, so you cannot cancel this order.";
        }

        throw new Error(customErrorMessage);
      }

      setSuccess("Your renewal has been successfully canceled.");

      const userData = storage.getUserData();
      const sku = getOrderProductSku(order);
      if (userData?.userId && sku) {
        updateYourCoachEligibility({
          member_id: String(userData.userId),
          eligibility: "stop_renewal",
          reason: "subscription_canceled",
          sku,
        }).catch((err) =>
          console.error("YourCoach stop_renewal failed:", err)
        );
      }

      setTimeout(() => {
        setActiveModal(null);
        if (onAddressUpdate) {
          onAddressUpdate();
        }
      }, 1500);
    } catch (error: any) {
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
        <Button
          variant="secondary"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setActiveModal("delivery");
          }}
          className="!px-3 !py-1.5 text-sm"
          size="sm"
        >
          <MapPin className="w-4 h-4 mr-1.5 text-primary-500" />
          Delivery
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setActiveModal("billing");
          }}
          className="!px-3 !py-1.5 text-sm"
          size="sm"
        >
          <Building className="w-4 h-4 mr-1.5 text-primary-500" />
          Billing
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setActiveModal("payment");
          }}
          className="!px-3 !py-1.5 text-sm"
          size="sm"
        >
          <CreditCard className="w-4 h-4 mr-1.5 text-primary-500" />
          Payment
        </Button>

        {order?.fullorderData?.order_status == 0 && (
          <Button
            variant="secondary"
            onClick={() => setActiveModal("confirmCancel")}
            className="!px-3 !py-1.5 text-sm"
            size="sm"
          >
            <X className="w-5 h-5 mr-1.5 text-primary-500" />
            Cancel Renewal
          </Button>
        )}
      </div>

      <Modal
        isOpen={activeModal === "delivery"}
        onClose={() => setActiveModal(null)}
        title="Update Delivery Address"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, "delivery")}
          onCancel={() => setActiveModal(null)}
          type="shipping"
          initialData={{
            street: billingAddress.shipping_address,
            city: billingAddress.shipping_city,
            state: billingAddress.shipping_state,
            zipCode: billingAddress.shipping_postcode,
            phone: billingAddress.phone,
            email: billingAddress.email,
          }}
          isSubmitting={isUpdating}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "billing"}
        onClose={() => setActiveModal(null)}
        title="Update Billing Address"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, "billing")}
          onCancel={() => setActiveModal(null)}
          type="billing"
          initialData={{
            street: billingAddress.billing_address,
            city: billingAddress.billing_city_name,
            state: billingAddress.billing_state_name,
            zipCode: billingAddress.billing_postcode,
          }}
          isSubmitting={isUpdating}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "payment"}
        onClose={() => setActiveModal(null)}
        title="Update Payment Method"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        <PaymentForm
          onSubmit={handlePaymentSubmit}
          onCancel={() => setActiveModal(null)}
          isDisabled={isUpdating}
        />
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={activeModal === "confirmCancel"}
        onClose={() => setActiveModal(null)}
        title="Cancel Renewal"
      >
        <p className="mb-4">
          Cancelling your renewal will only affect future orders. Your active
          order will not be canceled. <br /> Are you sure you want to proceed?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            No
          </Button>
          <Button variant="destructive" onClick={handleCancelConfirmation}>
            Yes
          </Button>
        </div>
      </Modal>

      {/* Reason Selection Modal */}
      <Modal
        isOpen={activeModal === "reasonSelection"}
        onClose={() => setActiveModal(null)}
        title="Select a Reason"
      >
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">
            Why are you canceling?
          </label>
          <select
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
          >
            <option value="">Select a reason</option>
            <option value="Medication not working">
              Medication not working
            </option>
            <option value="Medication too expensive">
              Medication too expensive
            </option>
            <option value="Don't need it anymore">Don't need it anymore</option>
            <option value="Unhappy with the medical care">
              Unhappy with the medical care
            </option>
            <option value="Order taking too long">Order taking too long</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {selectedOption === "Other" && (
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">
              Please specify your reason:
            </label>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCancelSubmit}
            disabled={isUpdating}
          >
            {isUpdating ? "Processing..." : "Submit"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
