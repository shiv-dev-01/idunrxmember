export interface CartProduct {
  product_id: number;
  product_name: string;
  product_description: string;
  product_price: string;
  product_sku: string;
  product_category_name: string;
  product_img: string;
  time: string;
  order_id: string;
  order_status: string;
  tracking_number: string;
  /** Array of intake completion date-times from API (get_user_cart_products_v5). */
  intakes_dates?: string[];
  form_url?: string;
  "form_url "?: string; // API response has this field with a space
  form_url_new?: string | null;
  is_sub: number;
  state_name?: string;
  state_code?: string;
  form_id?: string;
  decline_reason?: string;
  stage?: string;
  therapy_group?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  form_id_new?: string | null;
  continuation_link?: string | null;
  continuation_stamp?: string | null;
  continuation_date_utc?: string | null;
  msg22?: string | null;
  case_id?: string;
  prescriptions?: Array<{
    title: string;
    name: string;
    directions?: string;
    refills: number;
    quantity: number;
    days_supply: number;
  }>;
  billing_address?: string;
  billing_city?: string;
  billing_postcode?: string;
  billing_state?: string;
  country_name?: string;
  interval_days?: number;
  max_checkins?: number;
  filled_checkins?: number;
  /** Billing months / plan type */
  bm?: number;
  /** When "offline", do not show "Same Card" payment option */
  cc_type?: string;
}

export interface CartProductsResponse {
  status: number;
  message: string;
  product: CartProduct | CartProduct[];
}
