/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_HOST?: string;
  readonly VITE_IDUNRX_API_PATH?: string;
  readonly VITE_USE_DEV_PROXY?: string;
  readonly VITE_API_SAME_ORIGIN?: string;
  readonly VITE_WHITELABEL_SITE_ID?: string;
  readonly VITE_REFILL_CREATE_ORDER_START_URL?: string;
  readonly VITE_ONBOARDING_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_FORM_BASE_URL?: string;
  readonly VITE_REFILL_LOG_URL?: string;
  readonly VITE_WLMD_ORDER_OP_TEST_BASE?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PAYMENT_INTENT_URL?: string;
  readonly VITE_STRIPE_CREATE_ORDER_URL?: string;
  readonly VITE_YOURCOACH_ENV?: string;
  readonly VITE_YOURCOACH_CLIENT_ID?: string;
  readonly VITE_YOURCOACH_CLIENT_SECRET?: string;
  readonly VITE_YOURCOACH_PARTNER_ID?: string;
  readonly VITE_YOURCOACH_PRIVATE_KEY?: string;
  readonly VITE_YOURCOACH_API_BASE_URL?: string;
  readonly VITE_YOURCOACH_APP_ID?: string;
  readonly VITE_YOURCOACH_POPULATION_IDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
