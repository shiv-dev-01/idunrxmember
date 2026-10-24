/**
 * Refill purchase logger: records every purchase-related action on the Refills page.
 * Logs are sent to VITE_REFILL_LOG_URL (e.g. a local log server) and always written to console.
 * Log server should write to files rotated every 15 minutes.
 */

const LOG_URL = import.meta.env.VITE_REFILL_LOG_URL as string | undefined;

export type RefillLogEvent =
  | "payment_modal_open"
  | "payment_method_same"
  | "payment_method_new"
  | "payment_form_submit_start"
  | "payment_form_submit_success"
  | "payment_form_submit_error"
  | "create_order_member_start"
  | "create_order_member_success"
  | "create_order_member_error"
  | "process_order_start"
  | "process_order_success"
  | "process_order_error"
  | "stripe_redirect_return"
  | "stripe_create_order_success"
  | "stripe_create_order_error"
  | "pay_checkin_click"
  | "plan_selected";

export interface RefillLogPayload {
  event: RefillLogEvent;
  ts: string; // ISO
  /** Optional: order id, product id, user id, etc. */
  orderId?: string;
  productId?: string;
  userId?: string;
  email?: string;
  message?: string;
  /** Response or error summary (no sensitive card data) */
  response?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

function getLogLine(payload: RefillLogPayload): string {
  return `${payload.ts} [${payload.event}] ${JSON.stringify(payload)}\n`;
}

/**
 * Log a refill purchase-related event. Always logs to console; if VITE_REFILL_LOG_URL is set, also POSTs to that URL.
 */
export function logRefillPurchase(payload: Omit<RefillLogPayload, "ts">): void {
  const full = {
    ...payload,
    ts: new Date().toISOString(),
  } as RefillLogPayload;
  void getLogLine(full);
  console.log("[RefillPurchase]", full.event, full);
  if (LOG_URL && typeof fetch !== "undefined") {
    fetch(LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(full),
    }).catch((err) => console.warn("[RefillPurchase] Failed to send log:", err));
  }
}
