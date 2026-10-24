/**
 * YourCoach Integration Types
 */

export interface YourCoachCredentials {
  clientId: string;
  clientSecret: string;
  token: string;
}

export interface YourCoachDemographics {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  state?: string;
  zipcode?: string;
  dateOfBirth?: string;
  gender?: 'female' | 'male' | 'na' | null;
}

export interface YourCoachAdditionalData {
  question: string;
  answer: string;
}

export interface YourCoachUserInfo {
  partnerId: string;
  populationIds?: string[];
  demographics: YourCoachDemographics;
  additionalData?: YourCoachAdditionalData[];
}

export interface YourCoachSignupPayload {
  type: 'SIGNUP';
  payload: {
    api: 'core';
    clientId: string;
    clientSecret: string;
    token: string;
    appId?: string;
    userInfo: YourCoachUserInfo;
  };
}

export interface YourCoachLoginPayload {
  type: 'LOGIN';
  payload: {
    api: 'core';
    clientId: string;
    clientSecret: string;
    token: string;
    appId?: string;
  };
}

export type YourCoachWidgetPayload = YourCoachSignupPayload | YourCoachLoginPayload;

export type YourCoachWidgetEventType = 'TERMS_DECLINED' | 'AUTH_ERROR' | 'AUTH_SUCCESS';

export interface YourCoachWidgetEvent {
  type: YourCoachWidgetEventType;
  payload?: {
    error?: {
      code: string;
      message: string;
    };
  };
}

// API Request/Response types
export interface YourCoachAuthRequest {
  id: number;
  meta: {
    version: [number, number];
  };
  method: 'user.auth.external_auth';
  params: {
    client_id: string;
    client_secret: string;
    token: string;
    action: 'register' | 'login';
    device: string;
    push_token: null;
    population_ids?: string[];
    app_id?: string;
    external_offer_id?: string;
    user_info: {
      partner_id: string;
      demographics?: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
        state?: string | null;
        zipcode?: string | null;
        date_of_birth?: string | null;
        gender?: 'female' | 'male' | 'na' | null;
      };
      additional_data?: Array<{
        question: string;
        answer: string;
      }>;
    };
  };
}

export interface YourCoachStatusCheckRequest {
  id: number;
  meta: {
    version: [number, number];
  };
  method: 'user.auth.check_status';
  params: {
    client_id: string;
    client_secret: string;
    token: string;
    _response?: 'renewed';
  };
}

export type YourCoachEligibilityType = 'stop_now' | 'stop_renewal' | 'restart_now' | 'restart_renewal';
export type YourCoachEligibilityReason = 
  | 'subscription_canceled'
  | 'failed_payment'
  | 'refund_requested'
  | 'subscription_restarted'
  | 'user_fired'
  | 'fraud_detected'
  | 'refunded'
  | 'account_deleted'
  | 'trial_expired';

export interface YourCoachEligibilityEvent {
  eligibility: YourCoachEligibilityType;
  generated_at?: string;
  description?: string;
  reason?: YourCoachEligibilityReason;
}

export interface YourCoachEligibilityRequest {
  id: number;
  meta: {
    version: [number, number];
  };
  method: 'user.hooks.eligibility';
  params: {
    client_id: string;
    client_secret: string;
    token: string;
    external_offer_id?: string;
    event: YourCoachEligibilityEvent;
  };
}

export interface YourCoachProfileUpdateRequest {
  id: number;
  meta: {
    version: [number, number];
  };
  method: 'user.hooks.update_profile';
  params: {
    client_id: string;
    client_secret: string;
    token: string;
    demographics: Partial<{
      first_name: string;
      last_name: string;
      email: string;
      phone?: string | null;
      state?: string | null;
      zipcode?: string | null;
      date_of_birth?: string | null;
      gender?: 'female' | 'male' | 'na' | null;
    }>;
  };
}

export interface YourCoachApiResponse<T = any> {
  id: number;
  meta: Record<string, any>;
  result?: T;
  error?: {
    code: string;
    message: string;
    data?: Record<string, any>;
  };
  warnings?: string[];
}
