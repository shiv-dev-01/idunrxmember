/**
 * useYourCoach Hook
 * 
 * Provides convenient access to YourCoach authentication and subscription management
 */

import { useCallback, useState } from 'react';
import { generateYourCoachToken } from '../utils/yourcoach-token';
import {
  intelligentUserLogin,
  registerUserWithYourCoach,
  loginUserWithYourCoach,
  getUserProgramStatus,
  cancelUserSubscription,
  restartUserSubscription,
  stopSubscriptionRenewal,
} from '../utils/yourcoach-subscription';
import type { YourCoachDemographics, YourCoachEligibilityReason } from '../types/yourcoach';

interface UseYourCoachOptions {
  userId?: string | number;
}

export function useYourCoach(options?: UseYourCoachOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a JWT token for the user
   */
  const generateToken = useCallback(
    async (userId: string | number) => {
      try {
        setIsLoading(true);
        setError(null);
        const token = await generateYourCoachToken(userId);
        return token;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Register a new user with YourCoach
   */
  const register = useCallback(
    async (userId: string | number, demographics: YourCoachDemographics, additionalData?: Array<{ question: string; answer: string }>, externalOfferId?: string, partnerId?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await registerUserWithYourCoach(userId, demographics, additionalData, externalOfferId, partnerId);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Login an existing user
   */
  const login = useCallback(
    async (userId: string | number, externalOfferId?: string, partnerId?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await loginUserWithYourCoach(userId, externalOfferId, partnerId);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Intelligently handle login with fallback to registration
   */
  const smartLogin = useCallback(
    async (
      userId: string | number,
      demographics: YourCoachDemographics,
      additionalData?: Array<{ question: string; answer: string }>,
      externalOfferId?: string,
      partnerId?: string
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await intelligentUserLogin(userId, demographics, additionalData, externalOfferId, partnerId);
        if (!result.success) {
          setError(result.error || 'Login/Registration failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, action: 'login' as const, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Check user's program status
   */
  const checkStatus = useCallback(
    async (userId: string | number) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getUserProgramStatus(userId);
        if (result.error) {
          setError(result.error);
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Cancel a user's subscription
   */
  const cancel = useCallback(
    async (
      userId: string | number,
      reason: YourCoachEligibilityReason = 'subscription_canceled',
      description?: string,
      externalOfferId?: string
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await cancelUserSubscription(userId, reason, description, externalOfferId);
        if (!result.success) {
          setError(result.error || 'Cancellation failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Restart a user's subscription
   */
  const restart = useCallback(
    async (
      userId: string | number,
      reason: YourCoachEligibilityReason = 'subscription_restarted',
      description?: string,
      externalOfferId?: string
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await restartUserSubscription(userId, reason, description, externalOfferId);
        if (!result.success) {
          setError(result.error || 'Restart failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Stop subscription renewal without cancelling
   */
  const stopRenewal = useCallback(
    async (userId: string | number, reason?: YourCoachEligibilityReason, externalOfferId?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await stopSubscriptionRenewal(userId, reason, externalOfferId);
        if (!result.success) {
          setError(result.error || 'Stop renewal failed');
        }
        return result;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    clearError,
    generateToken,
    register,
    login,
    smartLogin,
    checkStatus,
    cancel,
    restart,
    stopRenewal,
  };
}
