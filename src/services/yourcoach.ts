/**
 * YourCoach API Service
 * 
 * Handles all API communications with YourCoach endpoints for:
 * - User authentication and registration
 * - Program status checking
 * - Subscription management (eligibility events)
 * - User profile updates
 */

import axios, { AxiosInstance } from 'axios';
import { getYourCoachApiUrl, YOURCOACH_CONFIG } from '../config/yourcoach';
import {
  YourCoachAuthRequest,
  YourCoachStatusCheckRequest,
  YourCoachEligibilityRequest,
  YourCoachProfileUpdateRequest,
  YourCoachApiResponse,
  YourCoachEligibilityType,
  YourCoachEligibilityReason,
  YourCoachDemographics,
} from '../types/yourcoach';
import { toE164 } from '../utils/yourcoach-phone';

let apiInstance: AxiosInstance | null = null;

/**
 * Create or get the YourCoach API instance
 */
function getApiInstance(): AxiosInstance {
  if (apiInstance) {
    return apiInstance;
  }

  apiInstance = axios.create({
    baseURL: getYourCoachApiUrl(),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for error handling
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('YourCoach API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  );

  return apiInstance;
}

/**
 * Register or login a user via the Auth API
 * 
 * @param token - JWT token with user_id
 * @param action - 'register' or 'login'
 * @param demographics - User demographic information
 * @param additionalData - Optional onboarding questions
 * @param device - Device info (user agent)
 * @returns Promise with API response
 */
export async function authExternalUser(
  token: string,
  action: 'register' | 'login',
  demographics: YourCoachDemographics,
  additionalData?: Array<{ question: string; answer: string }>,
  device?: string,
  externalOfferId?: string,
  partnerId?: string
): Promise<YourCoachApiResponse> {
  try {
    const api = getApiInstance();

    const payload: YourCoachAuthRequest = {
      id: Math.floor(Math.random() * 10000),
      meta: {
        version: [10, 0],
      },
      method: 'user.auth.external_auth',
      params: {
        client_id: YOURCOACH_CONFIG.clientId,
        client_secret: YOURCOACH_CONFIG.clientSecret,
        token,
        action,
        device: device || navigator.userAgent,
        push_token: null,
        population_ids: YOURCOACH_CONFIG.populationIds,
        app_id: YOURCOACH_CONFIG.appId,
        ...(externalOfferId && { external_offer_id: externalOfferId }),
        user_info: {
          partner_id: partnerId ?? YOURCOACH_CONFIG.partnerId,
          // Demographics and additional_data are only required for register, not login
          ...(action === 'register' && {
            demographics: {
              first_name: demographics.firstName,
              last_name: demographics.lastName,
              email: demographics.email,
              phone: toE164(demographics.phone),
              state: demographics.state || null,
              zipcode: demographics.zipcode || null,
              date_of_birth: demographics.dateOfBirth || null,
              gender: demographics.gender || null,
            },
            additional_data: additionalData,
          }),
        },
      },
    };

    const response = await api.post('/', payload);
    return response.data;
  } catch (error) {
    console.error('Error in authExternalUser:', error);
    throw error;
  }
}

/**
 * Check the real-time program status of a user
 * 
 * @param token - JWT token with user_id
 * @returns Promise with API response containing user status
 */
export async function checkUserStatus(token: string): Promise<YourCoachApiResponse> {
  try {
    const api = getApiInstance();

    const payload: YourCoachStatusCheckRequest = {
      id: Math.floor(Math.random() * 10000),
      meta: {
        version: [10, 0],
      },
      method: 'user.auth.check_status',
      params: {
        client_id: YOURCOACH_CONFIG.clientId,
        client_secret: YOURCOACH_CONFIG.clientSecret,
        token,
        _response: 'renewed',
      },
    };

    const response = await api.post('/', payload);
    return response.data;
  } catch (error) {
    console.error('Error in checkUserStatus:', error);
    throw error;
  }
}

/**
 * Send eligibility event to manage user subscriptions
 * 
 * @param token - JWT token with user_id
 * @param eligibility - Type of eligibility change (stop_now, restart_now, etc.)
 * @param reason - Reason for the change
 * @param description - Human-readable description
 * @returns Promise with API response
 */
export async function sendEligibilityEvent(
  token: string,
  eligibility: YourCoachEligibilityType,
  reason?: YourCoachEligibilityReason,
  description?: string,
  externalOfferId?: string
): Promise<YourCoachApiResponse> {
  try {
    const api = getApiInstance();

    const payload: YourCoachEligibilityRequest = {
      id: Math.floor(Math.random() * 10000),
      meta: {
        version: [10, 0],
      },
      method: 'user.hooks.eligibility',
      params: {
        client_id: YOURCOACH_CONFIG.clientId,
        client_secret: YOURCOACH_CONFIG.clientSecret,
        token,
        ...(externalOfferId && { external_offer_id: externalOfferId }),
        event: {
          eligibility,
          generated_at: new Date().toISOString(),
          description: description || `Eligibility changed to ${eligibility}`,
          reason,
        },
      },
    };

    const response = await api.post('/', payload);
    return response.data;
  } catch (error) {
    console.error('Error in sendEligibilityEvent:', error);
    throw error;
  }
}

/**
 * Update user profile information
 * 
 * @param token - JWT token with user_id
 * @param demographics - Updated demographic information
 * @returns Promise with API response
 */
export async function updateUserProfile(
  token: string,
  demographics: Partial<YourCoachDemographics>
): Promise<YourCoachApiResponse> {
  try {
    const api = getApiInstance();

    const payload: YourCoachProfileUpdateRequest = {
      id: Math.floor(Math.random() * 10000),
      meta: {
        version: [10, 0],
      },
      method: 'user.hooks.update_profile',
      params: {
        client_id: YOURCOACH_CONFIG.clientId,
        client_secret: YOURCOACH_CONFIG.clientSecret,
        token,
        demographics: {
          first_name: demographics.firstName,
          last_name: demographics.lastName,
          email: demographics.email,
          phone: demographics.phone,
          state: demographics.state,
          zipcode: demographics.zipcode,
          date_of_birth: demographics.dateOfBirth,
          gender: demographics.gender,
        },
      },
    };

    const response = await api.post('/', payload);
    return response.data;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
}

/**
 * Helper function to handle common YourCoach API errors
 */
export function handleYourCoachError(error: any): { code: string; message: string } {
  if (error.response?.data?.error) {
    return {
      code: error.response.data.error.code,
      message: error.response.data.error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
  };
}

/**
 * Check if an API response indicates the user doesn't exist in YourCoach
 */
export function isUserNotFoundResponse(response: YourCoachApiResponse): boolean {
  if (!response.error) return false;
  const { code, data } = response.error;
  return (
    code === 'error.resource.invalid_context' &&
    typeof data?.reason === 'string' &&
    data.reason.toLowerCase().includes('user does not exist')
  );
}

/**
 * Check if a thrown error indicates the user doesn't exist
 */
export function isUserNotFoundError(error: any): boolean {
  const yourcoachError = handleYourCoachError(error);
  return yourcoachError.code === 'USER_DOES_NOT_EXIST';
}
