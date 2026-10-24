/**
 * YourCoach Subscription Management Utilities
 * 
 * Handles subscription lifecycle management including:
 * - Registration flow with fallback
 * - Subscription cancellation
 * - Program restart
 * - Status checks
 */

import { generateYourCoachToken } from './yourcoach-token';
import {
  authExternalUser,
  checkUserStatus,
  sendEligibilityEvent,
  isUserNotFoundError,
  isUserNotFoundResponse,
} from '../services/yourcoach';
import type {
  YourCoachDemographics,
  YourCoachEligibilityType,
  YourCoachEligibilityReason,
} from '../types/yourcoach';

/**
 * Register a new user with YourCoach
 * 
 * @param userId - User ID from your system
 * @param demographics - User demographic information
 * @param additionalData - Optional onboarding questions and answers
 * @returns Promise with registration result
 */
export async function registerUserWithYourCoach(
  userId: string | number,
  demographics: YourCoachDemographics,
  additionalData?: Array<{ question: string; answer: string }>,
  externalOfferId?: string,
  partnerId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await generateYourCoachToken(userId);

    const response = await authExternalUser(
      token,
      'register',
      demographics,
      additionalData,
      undefined,
      externalOfferId,
      partnerId
    );

    if (response.error) {
      console.error('Registration error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('User registered successfully with YourCoach');
    return { success: true };
  } catch (error) {
    console.error('Error registering user with YourCoach:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Login an existing user with YourCoach
 * 
 * @param userId - User ID from your system
 * @returns Promise with login result
 */
export async function loginUserWithYourCoach(
  userId: string | number,
  externalOfferId?: string,
  partnerId?: string
): Promise<{ success: boolean; error?: string; userNotFound?: boolean }> {
  try {
    const token = await generateYourCoachToken(userId);

    const response = await authExternalUser(token, 'login', {} as any, undefined, undefined, externalOfferId, partnerId);

    if (response.error) {
      if (isUserNotFoundResponse(response)) {
        return { success: false, error: response.error.message, userNotFound: true };
      }

      console.error('Login error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('User logged in successfully with YourCoach');
    return { success: true };
  } catch (error) {
    console.error('Error logging in user with YourCoach:', error);
    
    // Check if it's a user not found error
    if (isUserNotFoundError(error)) {
      return { success: false, error: String(error), userNotFound: true };
    }

    return { success: false, error: String(error) };
  }
}

/**
 * Intelligently handle user registration with fallback
 * 
 * Tries LOGIN first, falls back to SIGNUP if user doesn't exist
 * 
 * @param userId - User ID from your system
 * @param demographics - User demographic information (required for signup)
 * @param additionalData - Optional onboarding questions
 * @returns Promise with result
 */
export async function intelligentUserLogin(
  userId: string | number,
  demographics: YourCoachDemographics,
  additionalData?: Array<{ question: string; answer: string }>,
  externalOfferId?: string,
  partnerId?: string
): Promise<{ success: boolean; action: 'login' | 'register'; error?: string }> {
  try {
    console.log('Attempting intelligent login for user:', userId);

    const loginResult = await loginUserWithYourCoach(userId, externalOfferId, partnerId);

    if (loginResult.success) {
      return { success: true, action: 'login' };
    }

    if (loginResult.userNotFound) {
      console.log('User not found, attempting registration...');
      const registerResult = await registerUserWithYourCoach(
        userId,
        demographics,
        additionalData,
        externalOfferId,
        partnerId
      );

      if (registerResult.success) {
        return { success: true, action: 'register' };
      }

      return { success: false, action: 'register', error: registerResult.error };
    }

    // Other login errors
    return { success: false, action: 'login', error: loginResult.error };
  } catch (error) {
    console.error('Error in intelligent login:', error);
    return { success: false, action: 'login', error: String(error) };
  }
}

/**
 * Get the current program status of a user
 * 
 * @param userId - User ID from your system
 * @returns Promise with status information
 */
export async function getUserProgramStatus(
  userId: string | number
): Promise<{ status?: string; error?: string }> {
  try {
    const token = await generateYourCoachToken(userId);
    const response = await checkUserStatus(token);

    if (response.error) {
      console.error('Status check error:', response.error);
      return { error: response.error.message };
    }

    return { status: response.result?.status };
  } catch (error) {
    console.error('Error checking user status:', error);
    return { error: String(error) };
  }
}

/**
 * Cancel a user's subscription immediately
 * 
 * @param userId - User ID from your system
 * @param reason - Reason for cancellation
 * @param description - Optional description
 * @returns Promise with result
 */
export async function cancelUserSubscription(
  userId: string | number,
  reason: YourCoachEligibilityReason = 'subscription_canceled',
  description = 'User requested subscription cancellation',
  externalOfferId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await generateYourCoachToken(userId);
    const response = await sendEligibilityEvent(
      token,
      'stop_now',
      reason,
      description,
      externalOfferId
    );

    if (response.error) {
      console.error('Cancellation error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('User subscription cancelled successfully');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Restart a user's subscription
 * 
 * @param userId - User ID from your system
 * @param reason - Reason for restart
 * @param description - Optional description
 * @returns Promise with result
 */
export async function restartUserSubscription(
  userId: string | number,
  reason: YourCoachEligibilityReason = 'subscription_restarted',
  description = 'User subscription restarted',
  externalOfferId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await generateYourCoachToken(userId);
    const response = await sendEligibilityEvent(
      token,
      'restart_now',
      reason,
      description,
      externalOfferId
    );

    if (response.error) {
      console.error('Restart error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('User subscription restarted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error restarting subscription:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handle subscription cancellation due to failed payment
 * 
 * @param userId - User ID from your system
 * @param description - Optional description of the failure
 * @returns Promise with result
 */
export async function handleFailedPayment(
  userId: string | number,
  description = 'Payment failed',
  externalOfferId?: string
): Promise<{ success: boolean; error?: string }> {
  return cancelUserSubscription(userId, 'failed_payment', description, externalOfferId);
}

/**
 * Handle subscription refund
 * 
 * @param userId - User ID from your system
 * @param description - Optional description
 * @returns Promise with result
 */
export async function handleRefund(
  userId: string | number,
  description = 'Refund processed',
  externalOfferId?: string
): Promise<{ success: boolean; error?: string }> {
  return cancelUserSubscription(userId, 'refunded', description, externalOfferId);
}

/**
 * Handle fraudulent activity
 * 
 * @param userId - User ID from your system
 * @param description - Optional description
 * @returns Promise with result
 */
export async function handleFraudDetected(
  userId: string | number,
  description = 'Fraudulent activity detected'
): Promise<{ success: boolean; error?: string }> {
  return cancelUserSubscription(userId, 'fraud_detected', description);
}

/**
 * Handle account deletion
 * 
 * @param userId - User ID from your system
 * @returns Promise with result
 */
export async function handleAccountDeletion(
  userId: string | number
): Promise<{ success: boolean; error?: string }> {
  return cancelUserSubscription(userId, 'account_deleted', 'Account deleted by user');
}

/**
 * Stop subscription renewal without stopping current access
 * 
 * @param userId - User ID from your system
 * @param reason - Reason for stopping renewal
 * @returns Promise with result
 */
export async function stopSubscriptionRenewal(
  userId: string | number,
  reason: YourCoachEligibilityReason = 'subscription_canceled',
  externalOfferId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await generateYourCoachToken(userId);
    const response = await sendEligibilityEvent(
      token,
      'stop_renewal',
      reason,
      'Subscription renewal stopped',
      externalOfferId
    );

    if (response.error) {
      console.error('Stop renewal error:', response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error stopping subscription renewal:', error);
    return { success: false, error: String(error) };
  }
}
