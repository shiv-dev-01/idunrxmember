import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { forgotPassword } from '../../services/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await forgotPassword(data.email);
      
      if (response.status === 1) {
        setSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to process request');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send reset password link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Password"
    >
      {success ? (
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Check Your Email</h3>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
          </p>
          <Button onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('email')}
                type="email"
                className="block w-full pl-10 form-input"
                placeholder="Enter your email address"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}