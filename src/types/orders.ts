export interface Order {
  id: string;
  date: string;
  status: "processing" | "shipped" | "delivered";
  trackingNumber?: string;
  productName?: string;
  dosage?: string;
  price?: string;
  productImage?: string;
  nextBillingDate?: string;
  fullorderData?: any;
  productCategoryName?: string;
  // New structure for multiple products
  products?: Array<{
    product_id: string;
    product_name: string;
    product_price: string;
    recurring_date: string;
    next_billing_date: string;
    sku: string;
    quantity: string;
    time_stamp: string;
    time: string;
    order_id: string;
    product_img: string;
    totalsBreakdown?: {
      subtotal: string;
      total: string;
      coupon_discount_amount?: string;
    };
  }>;
}

export interface BillingAddressResponse {
  status: number;
  message: string;
  billing_address: string;
  billing_city_name: string;
  billing_state_name: string;
  billing_country: string;
  billing_postcode: string;
  shipping_city: string;
  shipping_country: string;
  shipping_postcode: string;
  shipping_state: string;
  shipping_address: string;
  phone: string;
  email: string;
}

export interface OrderDetailsResponse {
  status: number;
  message: string;
  product: Array<{
    product_id: string;
    product_name: string;
    product_price: string;
    recurring_date: string;
    next_billing_date: string;
    sku: string;
    quantity: string;
    time_stamp: string;
    time: string;
    order_id: string;
    product_img: string;
  }>;
}

export interface OrdersResponse {
  status: number;
  message: string;
  product: Array<{
    order_id: string;
    time: string;
    order_status: string;
    tracking_number: string;
    product_name: string;
  }>;
}

export interface OrderOpTestResponse {
  status: string;
  message: string;
  "previous-prescription"?: boolean;
  data?: {
    first_name: string;
    last_name: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
    therapy: string;
    stage: string;
    order_id: string;
    intake_id: string;
    unique_id: string;
    prescription_id: string | null;
    intake_form_id: string;
    needs: string[];
  };
}
