export interface PaymentUpdateResponse {
  status: number;
  message: string;
}

export interface PaymentFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

/** createOrder_member (refill / member checkout) */
export interface CreateOrderMemberResponse {
  status: number;
  message: string;
  order_id?: string;
}