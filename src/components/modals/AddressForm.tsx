import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/Button";
import { LoadingBar } from "../ui/LoadingBar";
import { useLocationData } from "../../hooks/useLocationData";
import { Modal } from "../../components/ui/Modal";

const addressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (data: AddressFormData & { stateCode: string }) => Promise<void>;
  onCancel: () => void;
  type: "shipping" | "billing";
  initialData?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  isSubmitting?: boolean;
}

export function AddressForm({
  onSubmit,
  onCancel,
  type,
  initialData,
  isSubmitting = false,
}: AddressFormProps) {
  const [isConfirming, setIsConfirming] = useState(false); // New state for confirmation modal
  const [formData, setFormData] = useState<AddressFormData | null>(null); // Store form data temporarily

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: initialData?.street || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zipCode: initialData?.zipCode || "",
    },
  });

  const selectedState = watch("state");
  const { states, cities, isLoadingStates, isLoadingCities } =
    useLocationData(selectedState);

  useEffect(() => {
    if (initialData?.state && initialData?.city) {
      setValue("state", initialData.state);
      setValue("city", initialData.city);
    }
  }, [initialData, setValue]);

  const handleFormSubmit = (data: AddressFormData) => {
    setFormData(data); // Store form data temporarily
    setIsConfirming(true); // Show confirmation modal
  };

  const handleConfirmSubmit = async () => {
    if (!formData) return;
    const selectedStateData = states.find((s) => s.name === formData.state);
    if (!selectedStateData) {
      throw new Error("Invalid state selected");
    }
    setIsConfirming(false); // Close confirmation modal
    await onSubmit({ ...formData, stateCode: selectedStateData.state_code });
  };

  if (isConfirming) {
    return (
      <div className="space-y-4">
        <p className="mb-4">
          The address will be updated for all future orders. Do you want to
          proceed?
        </p>
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setIsConfirming(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} disabled={isSubmitting}>
            OK
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <LoadingBar isLoading={isSubmitting} />

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Street Address
          </label>
          <input
            {...register("street")}
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Enter street address"
            disabled={isSubmitting}
          />
          {errors.street && (
            <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              State
            </label>
            <select
              {...register("state")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={isLoadingStates || isSubmitting}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state.state_code} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">
                {errors.state.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
            <select
              {...register("city")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={!selectedState || isLoadingCities || isSubmitting}
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            ZIP Code
          </label>
          <input
            {...register("zipCode")}
            type="text"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Enter ZIP code"
            disabled={isSubmitting}
          />
          {errors.zipCode && (
            <p className="mt-1 text-sm text-red-600">
              {errors.zipCode.message}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Updating..."
              : `Update ${
                  type === "shipping" ? "Delivery" : "Billing"
                } Address`}
          </Button>
        </div>
      </form>
    </>
  );
}
