import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { AccountFormData } from '../types';

interface AddressFormProps {
  type: 'shipping' | 'billing';
  register: UseFormRegister<AccountFormData>;
  errors: FieldErrors<AccountFormData>;
}

export function AddressForm({ type, register, errors }: AddressFormProps) {
  const title = type === 'shipping' ? '🚚 Shipping Address' : '💳 Billing Address';
  const prefix = type === 'shipping' ? 'shippingAddress' : 'billingAddress';
  const addressErrors = errors[type === 'shipping' ? 'shippingAddress' : 'billingAddress'];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="form-label" htmlFor={`${prefix}.street`}>
            Street Address
          </label>
          <input
            {...register(`${prefix}.street` as const)}
            id={`${prefix}.street`}
            type="text"
            className="form-input"
            placeholder="Enter street address"
          />
          {addressErrors?.street && (
            <p className="form-error">{addressErrors.street.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor={`${prefix}.city`}>
              City
            </label>
            <input
              {...register(`${prefix}.city` as const)}
              id={`${prefix}.city`}
              type="text"
              className="form-input"
              placeholder="Enter city"
            />
            {addressErrors?.city && (
              <p className="form-error">{addressErrors.city.message}</p>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor={`${prefix}.state`}>
              State
            </label>
            <input
              {...register(`${prefix}.state` as const)}
              id={`${prefix}.state`}
              type="text"
              className="form-input"
              placeholder="Enter state"
            />
            {addressErrors?.state && (
              <p className="form-error">{addressErrors.state.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor={`${prefix}.zipCode`}>
              ZIP Code
            </label>
            <input
              {...register(`${prefix}.zipCode` as const)}
              id={`${prefix}.zipCode`}
              type="text"
              className="form-input"
              placeholder="Enter ZIP code"
            />
            {addressErrors?.zipCode && (
              <p className="form-error">{addressErrors.zipCode.message}</p>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor={`${prefix}.country`}>
              Country
            </label>
            <input
              {...register(`${prefix}.country` as const)}
              id={`${prefix}.country`}
              type="text"
              className="form-input"
              placeholder="Enter country"
            />
            {addressErrors?.country && (
              <p className="form-error">{addressErrors.country.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}