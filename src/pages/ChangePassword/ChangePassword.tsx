import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/layout/Logo';
import { LoadingBar } from '../../components/ui/LoadingBar';
import { changePassword } from '../../services/auth';
import { useAuth } from '../../providers/AuthProvider';

const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Ensure we have the required state
  if (!location.state?.email || !location.state?.tempPassword) {
    navigate('/login');
    return null;
  }

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await changePassword(
        location.state.email,
        location.state.tempPassword,
        data.newPassword
      );

      if (response.status === 1) {
        // Session cookie from backend; do not store login_token
        establishSession(response);
        navigate('/dashboard');
      } else {
        throw new Error(response.message || 'Failed to update password');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Change Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please set a new password for your account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    {...register('newPassword')}
                    type="password"
                    className="form-input"
                    placeholder="Enter your new password"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    className="form-input"
                    placeholder="Confirm your new password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Button 
                  type="submit" 
                  fullWidth 
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}