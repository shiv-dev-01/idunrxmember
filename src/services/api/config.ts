import axios from "axios";
import { storage } from "../../utils/storage";

const API_PATH =
  import.meta.env.VITE_IDUNRX_API_PATH ?? "/idunrx_token_proxy";
const API_HOST =
  import.meta.env.VITE_API_HOST ?? "https://panel.whitelabelmd.com";
// Hostinger (temp): https://lightgoldenrodyellow-okapi-586794.hostingersite.com
const USE_DEV_PROXY = import.meta.env.VITE_USE_DEV_PROXY === "true";
const USE_SAME_ORIGIN = import.meta.env.VITE_API_SAME_ORIGIN === "true";

/**
 * Member API origin. Production uses the nginx proxy on this host so
 * `idunrx_session` is first-party. Cross-origin panel URLs make that
 * cookie third-party; iOS Safari blocks it and login bounces to /login.
 */
export const API_ORIGIN =
  import.meta.env.DEV && USE_DEV_PROXY
    ? API_PATH
    : import.meta.env.DEV && !USE_SAME_ORIGIN
      ? `${API_HOST}${API_PATH}`
      : API_PATH;

/** Panel host for wlmdbackend / v1 — same-origin via proxy in DEV (avoids CORS + credentials) */
export const PANEL_ORIGIN =
  (import.meta.env.DEV && USE_DEV_PROXY) || USE_SAME_ORIGIN ? "" : API_HOST;

const WHITELABEL_SITE_ID = import.meta.env.VITE_WHITELABEL_SITE_ID ?? "314";

const credentialsConfig = {
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
};

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  ...credentialsConfig,
});

/** Same panel API client (legacy aliases used by Refills / shared utils). */
export const api2 = api;
export const api3 = api;

/**
 * Order-op test data URL builder.
 * Override with VITE_WLMD_ORDER_OP_TEST_BASE (no trailing slash).
 */
export function buildOrderOpTestUrl(orderId: string): string {
  const base =
    (import.meta.env.VITE_WLMD_ORDER_OP_TEST_BASE as string) ||
    `${API_ORIGIN}/api/getOrderOpTest/${WHITELABEL_SITE_ID}`;
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(orderId)}`;
}

/** Fetch wrapper that sends session cookies (for raw fetch calls). */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, { credentials: "include", ...init });
}

export { panelApi } from "./panelApi";

// Panel WLMD clients — same pattern as main api (proxy in DEV, credentials, no authtoken)
export const whitelabelApi = axios.create({
  baseURL: `${PANEL_ORIGIN}/wlmdbackend/api/client/site/${WHITELABEL_SITE_ID}`,
  ...credentialsConfig,
});

export const whitelabelApi180 = axios.create({
  baseURL: `${PANEL_ORIGIN}/wlmdbackend/api/client/site/${WHITELABEL_SITE_ID}`,
  ...credentialsConfig,
});

export const whitelabelUploadApi = axios.create({
  baseURL: `${PANEL_ORIGIN}/wlmdbackend/api`,
  ...credentialsConfig,
});

export const mdIntegrationsApi = axios.create({
  baseURL: `${PANEL_ORIGIN}/v1/site/${WHITELABEL_SITE_ID}`,
  ...credentialsConfig,
});

function requestUrl(config?: { url?: string; baseURL?: string }): string {
  return `${config?.baseURL ?? ""}${config?.url ?? ""}`;
}

function isOptionalAuthRequest(config?: { url?: string; baseURL?: string }): boolean {
  return requestUrl(config).includes("generateHash");
}

function isSessionExpiredMessage(message?: string): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  // Do not treat generic "unauthorized" as logout — iOS often gets that
  // when a cookie is missing; bouncing to /login is the Orders bug.
  return lower.includes("session expired") || lower.includes("token expired");
}

function handleSessionExpired(message?: unknown) {
  storage.clearAuth();
  if (typeof message === "string") {
    console.warn("Session expired:", message);
  }
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function ensureCsrfCookieIfNeeded(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_DEV_PROXY !== "true") {
    return;
  }

  try {
    await axios.get(`${API_ORIGIN}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  } catch {
    // Never block login if CSRF preflight fails.
  }
}

api.interceptors.response.use(
  (response) => {
    if (isOptionalAuthRequest(response.config)) {
      return response;
    }
    const data = response.data as { status?: number; message?: string };
    if (data?.status === 0 && isSessionExpiredMessage(data.message)) {
      handleSessionExpired(data.message);
    }
    return response;
  },
  (error) => {
    if (isOptionalAuthRequest(error.config)) {
      return Promise.reject(error);
    }
    const data = error.response?.data as { status?: number; message?: string };
    const message =
      typeof data?.message === "string" ? data.message : undefined;

    if (isSessionExpiredMessage(message)) {
      handleSessionExpired(message);
    }

    return Promise.reject(error);
  }
);
