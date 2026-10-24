/**
 * YourCoach Offer Parameter Helpers
 *
 * Maps CartProduct data to the partner_id and external_offer_id
 * required by YourCoach's user.auth.external_auth and user.hooks.eligibility endpoints.
 *
 * partner_id   — identifies the program category (e.g. weight management)
 * external_offer_id — identifies the subscription duration (1/3/6/12 months)
 */

import { YOURCOACH_CONFIG } from '../config/yourcoach';
import type { CartProduct } from '../types/products';
import type { Order } from '../types/orders';

type OfferDuration = '1m' | '3m' | '6m' | '12m';

interface ProductLike {
  product_name: string;
  product_sku?: string;
  sku?: string;
  product_category_name?: string;
}

/**
 * Derive the subscription duration from a product SKU or name.
 *
 * Priority:
 * 1. Hard-coded SKU map in config (exact, reliable)
 * 2. Regex fallback on product name + SKU text (best-effort for unknown SKUs)
 */
export function detectOfferDuration(product: ProductLike): OfferDuration | null {
  const sku = product.product_sku ?? product.sku ?? '';

  // 1. Exact SKU lookup
  const mapped = YOURCOACH_CONFIG.skuOfferMap[sku];
  if (mapped) {
    const duration = Object.entries(YOURCOACH_CONFIG.offerIds).find(
      ([, v]) => v === mapped
    )?.[0] as OfferDuration | undefined;
    if (duration) return duration;
  }

  // 2. Regex fallback
  const text = `${product.product_name} ${sku}`.toLowerCase();
  if (/\b12[\s-]?m(o(nth)?s?)?\b|annual|yearly/.test(text)) return '12m';
  if (/\b6[\s-]?m(o(nth)?s?)?\b/.test(text)) return '6m';
  if (/\b3[\s-]?m(o(nth)?s?)?\b/.test(text)) return '3m';
  if (/\b1[\s-]?m(o(nth)?s?)?\b/.test(text)) return '1m';

  return null;
}

/**
 * Derive the YourCoach partner_id from a product's category.
 *
 * "Weight Loss", "GLP-1", "Semaglutide" etc. → idunrx_weight_mgmt
 * "Women's Health", "HRT", "TRT"           → idunrx_women_health
 * Anything unrecognised falls back to weight management.
 */
export function detectPartnerId(product: ProductLike): string {
  const category = (product.product_category_name ?? '').toLowerCase();

  // Confirmed category names from API:
  // "Weight Loss" → weight management program
  // Future: "Women's Health", "HRT", "TRT" → women's health program
  if (/women|hrt|trt|hormon/.test(category)) {
    return YOURCOACH_CONFIG.partnerIds.womenHealth;
  }

  return YOURCOACH_CONFIG.partnerIds.weightManagement;
}

/**
 * Derive both partner_id and external_offer_id from a CartProduct.
 *
 * Usage:
 *   const { partnerId, externalOfferId } = getYourCoachOfferParams(product);
 *   await smartLogin(userId, demographics, undefined, externalOfferId, partnerId);
 */
export function getYourCoachOfferParams(product: CartProduct): {
  partnerId: string;
  externalOfferId: string | undefined;
} {
  const partnerId = detectPartnerId(product);
  const duration = detectOfferDuration(product);
  const externalOfferId = duration ? YOURCOACH_CONFIG.offerIds[duration] : undefined;

  return { partnerId, externalOfferId };
}

/**
 * Derive both partner_id and external_offer_id from an Order.
 * Uses the first product line for name/SKU and the order's product category.
 */
export function getYourCoachOfferParamsFromOrder(order: Order): {
  partnerId: string;
  externalOfferId: string | undefined;
} {
  const firstProduct = order.products?.[0];
  const productLike: ProductLike = {
    product_name: firstProduct?.product_name ?? order.productName ?? '',
    sku: firstProduct?.sku,
    product_category_name: order.productCategoryName,
  };
  const partnerId = detectPartnerId(productLike);
  const duration = detectOfferDuration(productLike);
  const externalOfferId = duration ? YOURCOACH_CONFIG.offerIds[duration] : undefined;

  return { partnerId, externalOfferId };
}

/**
 * Product SKU from an order line (for backend /yourcoach/eligibility).
 */
export function getOrderProductSku(order: Order): string | undefined {
  const sku = order.products?.[0]?.sku?.trim();
  return sku || undefined;
}
