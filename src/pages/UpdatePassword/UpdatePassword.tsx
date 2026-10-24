import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LoadingBar } from '../../components/ui/LoadingBar';
import { passwordSchema } from './schemas/passwordSchema';
import type { PasswordFormData } from './types';
import { storage } from '../../utils/storage';
import { updatePassword } from '../../services/auth';

export function UpdatePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      const userData = storage.getUserData();
      if (!userData?.userId || !userData?.email) {
        throw new Error('User data not found');
      }

      const response = await updatePassword({
        userId: userData.userId,
        email: userData.email,
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.status === 1) {
        setSuccess(true);
        reset();
      } else {
        throw new Error(response.message || 'Failed to update password');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordInput = (
    field: keyof PasswordFormData,
    label: string,
    show: boolean,
    setShow: (show: boolean) => void,
    placeholder: string
  ) => (
    <div>
      <label className="form-label" htmlFor={field}>
        {label}
      </label>
      <div className="relative">
        <input
          {...register(field)}
          type={show ? 'text' : 'password'}
          id={field}
          className="form-input pr-10"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          onClick={() => setShow(!show)}
        >
          {show ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
      {errors[field] && (
        <p className="form-error">{errors[field]?.message}</p>
      )}
    </div>
  );

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">🔒 Update Password</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Choose a strong password to protect your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex gap-2 text-red-700">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>Password updated successfully!</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card space-y-4">
            {renderPasswordInput(
              'currentPassword',
              'Current Password',
              showCurrentPassword,
              setShowCurrentPassword,
              'Enter your current password'
            )}

            {renderPasswordInput(
              'newPassword',
              'New Password',
              showNewPassword,
              setShowNewPassword,
              'Enter your new password'
            )}

            {renderPasswordInput(
              'confirmPassword',
              'Confirm New Password',
              showConfirmPassword,
              setShowConfirmPassword,
              'Confirm your new password'
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-medium text-blue-800">
              Password Requirements
            </h4>
          </div>
          <ul className="text-sm text-blue-700 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              At least 8 characters
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              One uppercase letter
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              One lowercase letter
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              One number
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              One special character (e.g., @, #, $)
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}