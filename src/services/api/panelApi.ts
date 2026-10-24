/**
 * Panel API URL helpers for IdunRx member portal.
 * Session auth is handled via HttpOnly cookies on the axios `api` client.
 *
 * Note: duplicates origin resolution from config to avoid circular imports.
 */

const API_PATH =
  import.meta.env.VITE_IDUNRX_API_PATH ?? "/idunrx_token_proxy";
const API_HOST =
  import.meta.env.VITE_API_HOST ?? "https://panel.whitelabelmd.com";
const USE_DEV_PROXY = import.meta.env.VITE_USE_DEV_PROXY === "true";
const USE_SAME_ORIGIN = import.meta.env.VITE_API_SAME_ORIGIN === "true";

const API_ORIGIN =
  import.meta.env.DEV && USE_DEV_PROXY
    ? API_PATH
    : USE_SAME_ORIGIN
      ? API_PATH
      : `${API_HOST}${API_PATH}`;

class PanelApi {
  /** Base origin (e.g. https://panel.whitelabelmd.com/idunrx_token_v2) — no trailing slash */
  get baseUrl(): string {
    return API_ORIGIN.replace(/\/$/, "");
  }

  /** Full URL for IdunRx API (e.g. .../idunrx_token_v2/api) */
  get apiBase(): string {
    return `${this.baseUrl}/api`;
  }

  url(path: string): string {
    const p = path.startsWith("/") ? path.slice(1) : path;
    return `${this.apiBase}/${p}`;
  }

  /** Alias used by refill webhook tracker (parity with reference project). */
  ageshiftUrl(path: string): string {
    return this.url(path);
  }
}

export const panelApi = new PanelApi();
