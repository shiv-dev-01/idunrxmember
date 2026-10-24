/**
 * YourCoach Configuration
 * 
 * This file contains all YourCoach integration settings.
 * Update these values based on the environment and YourCoach team feedback.
 */

export const YOURCOACH_CONFIG = {
  // Widget URLs by environment
  widget: {
    staging: 'https://widget.rc.yourcoach.health',
    production: 'https://widget.yourcoach.health',
  },

  // API Endpoints by environment
  // Browser calls must be same-origin OR YourCoach must allow your domain (CORS).
  // Local dev: Vite proxies /yourcoach-api → api based on VITE_YOURCOACH_ENV
  // Production: set VITE_YOURCOACH_API_BASE_URL=/yourcoach-api if AWS/CloudFront proxies that path,
  // OR ask YourCoach to enable CORS for your portal domain (e.g. https://member.idunrx.com).
  api: {
    staging: 'https://api.rc.yourcoach.health',
    development: 'https://api.stage1.yourcoach.health',
    production: 'https://api.yourcoach.health',
  },

  // Current environment (change based on deployment)
  currentEnvironment: (import.meta.env.VITE_YOURCOACH_ENV || 'production') as 'staging' | 'production' | 'development',

  // Default partner ID (legacy / fallback)
  partnerId: import.meta.env.VITE_YOURCOACH_PARTNER_ID || 'idunrx',

  // Partner IDs per product category (provided by YourCoach)
  partnerIds: {
    weightManagement: 'idunrx_weight_mgmt',
    womenHealth: 'idunrx_women_health',
  },

  // External offer IDs per subscription duration (provided by YourCoach)
  offerIds: {
    '1m': 'idunrx_sub_1m',
    '3m': 'idunrx_sub_3m',
    '6m': 'idunrx_sub_6m',
    '12m': 'idunrx_sub_12m',
  },

  // Hard-coded SKU → offer ID map (confirmed with backend team)
  skuOfferMap: {
    'Semaginj-CR1':  'idunrx_sub_1m',
    'Semaginj-CR3':  'idunrx_sub_3m',
    'Semaginj-CR6':  'idunrx_sub_6m',
    'Semaginj-CR12': 'idunrx_sub_12m',
  } as Record<string, string>,

  // Client credentials (provided by YourCoach)
  clientId: import.meta.env.VITE_YOURCOACH_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_YOURCOACH_CLIENT_SECRET || '',

  // App ID (optional, for multi-app deployments)
  appId: import.meta.env.VITE_YOURCOACH_APP_ID,

  // Population IDs (customizable based on user segments)
  populationIds: (import.meta.env.VITE_YOURCOACH_POPULATION_IDS || '')
    .split(',')
    .filter(Boolean),

  // Onboarding questions (customize as needed)
  onboardingQuestions: [
    {
      question: 'How ready are you to make changes to your health?',
      answer: 'Very', // Default answer, can be customized per user
    },
    {
      question: 'Please share any health-related concerns or additional details that you would like to share with your coach. If none, just write "none".',
      answer: 'None', // Can be customized per user
    },
  ],

  // Widget iframe configuration
  iframeConfig: {
    width: '100%',
    height: '100%',
    style: { border: 'none' },
    allow: 'camera;microphone;fullscreen;compute-pressure',
  },

  // Get widget URL based on current environment
  getWidgetUrl: function() {
    return this.widget[this.currentEnvironment];
  },

  // Get API endpoint based on current environment
  getApiUrl: function() {
    const proxyOverride = import.meta.env.VITE_YOURCOACH_API_BASE_URL?.trim();
    if (proxyOverride) {
      return proxyOverride;
    }

    // Local dev: use Vite proxy to avoid CORS
    if (import.meta.env.DEV) {
      return '/yourcoach-api';
    }

    if (this.currentEnvironment === 'development') {
      return this.api.development;
    }
    if (this.currentEnvironment === 'production') {
      return this.api.production;
    }
    return this.api.staging;
  },
} as const;

/**
 * JWT Token Generation Configuration
 */
export const JWT_CONFIG = {
  // Private key from environment (loaded from .env)
  privateKey: import.meta.env.VITE_YOURCOACH_PRIVATE_KEY || '',

  // Algorithm for signing (RSA256)
  algorithm: 'RS256',

  // Token expiration
  expirationTime: '1m', // Can be adjusted based on requirements

  // Issuer
  issuer: 'idunrx',
};

/**
 * Helper function to get the complete widget URL
 */
export function getYourCoachWidgetUrl(): string {
  return YOURCOACH_CONFIG.getWidgetUrl();
}

/**
 * Helper function to get the complete API URL
 */
export function getYourCoachApiUrl(): string {
  return YOURCOACH_CONFIG.getApiUrl();
}

/**
 * Validate that all required credentials are configured
 */
export function validateYourCoachConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!YOURCOACH_CONFIG.clientId) {
    errors.push('VITE_YOURCOACH_CLIENT_ID is not configured');
  }

  if (!YOURCOACH_CONFIG.clientSecret) {
    errors.push('VITE_YOURCOACH_CLIENT_SECRET is not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
