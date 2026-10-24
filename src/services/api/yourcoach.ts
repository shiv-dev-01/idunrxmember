import axios from 'axios';
import { api } from './config';

export type YourCoachEligibilityAction =
  | 'stop_renewal'
  | 'stop_now'
  | 'restart_renewal';

export type YourCoachEligibilityReason =
  | 'subscription_canceled'
  | 'failed_payment'
  | 'refunded'
  | 'subscription_restarted';

export interface YourCoachSessionTokenResponse {
  token: string;
}

export interface YourCoachEligibilityResponse {
  success: boolean;
}

export interface YourCoachEligibilityRequest {
  member_id: string;
  eligibility: YourCoachEligibilityAction;
  reason: YourCoachEligibilityReason;
  sku: string;
}

/**
 * JWT for the YourCoach widget (RS256, signed server-side).
 */
export async function fetchYourCoachSessionToken(
  memberId: string | number
): Promise<string> {
  try {
    const response = await api.post<YourCoachSessionTokenResponse>(
      '/yourcoach/session-token',
      { member_id: String(memberId) }
    );
    const token = response.data?.token;
    if (!token) {
      throw new Error('Session token missing from response');
    }
    return token;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data as { message?: string };
      throw new Error(data.message || 'Failed to get coaching session token');
    }
    throw error;
  }
}

/**
 * Notify YourCoach of subscription eligibility changes (cancel, renew, etc.).
 */
export async function updateYourCoachEligibility(
  payload: YourCoachEligibilityRequest
): Promise<YourCoachEligibilityResponse> {
  try {
    const response = await api.post<YourCoachEligibilityResponse>(
      '/yourcoach/eligibility',
      payload
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data as { message?: string };
      throw new Error(data.message || 'Failed to update coaching eligibility');
    }
    throw error;
  }
}
