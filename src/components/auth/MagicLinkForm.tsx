import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { sendMagicLink } from '../../services/api';

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmit = async (data: MagicLinkFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await sendMagicLink(data.email);
      
      if (response.status === 1) {
        setSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to send magic link');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Check Your Email</h3>
        <p className="text-gray-600">
          We've sent a magic link to your email address. Click the link to sign in instantly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
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

      <div>
        <Button
          type="submit"
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </div>
    </form>
  );
}