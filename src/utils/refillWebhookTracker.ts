/**
 * Refill webhook tracker: sends events to refill-webhook API.
 * Used only for "Check In Now" button click on Refills page.
 */

import { apiFetch, panelApi } from "../services/api/config";

const REFILL_WEBHOOK_URL = panelApi.ageshiftUrl("refill-webhook");

export interface RefillWebhookPayload {
  email: string;
  order_id: string;
  event_type: string;
  button_name: string;
  page: string;
  device: string;
  browser: string;
  message?: string;
}

function getDevice(): "desktop" | "mobile" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  ) {
    return "mobile";
  }
  return "desktop";
}

function getBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  let browser = "unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "safari";
  else if (ua.includes("Firefox")) browser = "firefox";
  else if (ua.includes("Edg")) browser = "edge";
  return browser;
}

function buildPayload(params: {
  email: string;
  order_id?: string;
  event_type?: string;
  button_name: string;
  page?: string;
  device?: string;
  browser?: string;
  message?: string;
}): RefillWebhookPayload {
  const payload: RefillWebhookPayload = {
    email: params.email || "",
    order_id: params.order_id || "",
    event_type: params.event_type ?? "refill_click",
    button_name: params.button_name || "unknown",
    page: params.page ?? "Refills",
    device: params.device ?? getDevice(),
    browser: params.browser ?? getBrowser(),
  };
  if (params.message != null && params.message !== "") {
    payload.message = params.message;
  }
  return payload;
}

/**
 * Send a refill event to the webhook API (e.g. Check In Now click, Pay & Check-in).
 * Fire-and-forget; errors are logged but not thrown.
 */
export function trackRefillClick(params: {
  email: string;
  order_id?: string;
  event_type?: string;
  button_name: string;
  page?: string;
  device?: string;
  browser?: string;
  message?: string;
}): void {
  const payload = buildPayload(params);
  apiFetch(REFILL_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.warn("[RefillWebhook] Failed to send tracking:", err);
  });
}

/**
 * Send refill webhook via sendBeacon (for page unload / navigation away).
 * Use when user clicked Pay & Check-in but left without completing Stripe.
 */
export function trackRefillClickSendBeacon(params: {
  email: string;
  order_id?: string;
  event_type?: string;
  button_name: string;
  page?: string;
  device?: string;
  browser?: string;
  message?: string;
}): boolean {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
  const payload = buildPayload(params);
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  return navigator.sendBeacon(REFILL_WEBHOOK_URL, blob);
}
