import axios from "axios";
import type { CartProductsResponse } from "../../types/products";
import { api } from "./config";
import { storage } from "../../utils/storage";

const SITE_ID = import.meta.env.VITE_WHITELABEL_SITE_ID ?? "314";

export const getUserCartProducts = async (
  email: string
): Promise<CartProductsResponse> => {
  try {
    const response = await api.post("/get_user_cart_products", {
      email: email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getUserCartProductsV2 = async (
  email: string
): Promise<CartProductsResponse> => {
  try {
    const response = await api.post("/get_user_cart_products_v2", {
      email: email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getUserCartProductsV5 = async (
  email: string
): Promise<CartProductsResponse> => {
  try {
    const response = await api.post("/get_user_cart_products_v5", {
      email: email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export interface WeightLossProduct {
  product_id: string;
  uniq_id: string;
  product_name: string;
  product_description: string;
  product_price: string;
  form_url: string | null;
  form_id: string | null;
  product_sku: string;
  product_category_name: string;
  vertical_name: string;
  product_is_trial: string;
  product_is_shippable: string;
  product_rebill_product: string;
  product_rebill_days: string;
  product_max_quantity: string;
  preserve_recurring_quantity: string;
  subscription_type: string;
  org_price?: string;
  subscription_week: string;
  subscription_day: string;
  cost_of_goods_sold: string;
  taxable: string;
  product_img: unknown[];
}

export interface WeightLossProductsResponse {
  product: WeightLossProduct[];
  status: number;
  message: string;
}

export const getWeightLossProducts =
  async (): Promise<WeightLossProductsResponse> => {
    try {
      const email = storage.getUserData()?.email ?? "";
      if (!email) {
        throw new Error("User email not found");
      }

      const response = await api.post("/get_weight_loss_products_v2", {
        email,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw error.response.data;
      }
      throw error;
    }
  };

export interface ProcessOrderStep1 {
  response_code: string;
  order_id?: {
    [key: string]: {
      next_rebill_product?: {
        response_code: string;
      };
      billing_model_id?: {
        response_code: string;
      };
      allow_product_swap?: {
        response_code: string;
      };
    };
  };
}

export interface ProcessOrderStep2 {
  response_code: string;
  response_message?: string;
  error_found: string;
  error_message?: string;
  gateway_id?: string;
  order_id?: string;
  status?: string;
  transactionID?: string;
  authId?: string;
  resp_code?: string;
  transId?: string;
  resp_msg?: string;
  newid?: string;
  upsell_amount?: string;
  uses_billing_models?: string;
  totalOrderAmount?: string;
}

export interface ProcessOrderResponse {
  status: number;
  message: string;
  step1?: ProcessOrderStep1;
  step2?: ProcessOrderStep2;
}

export const processOrder = async ({
  orderId,
  productId,
}: {
  orderId: string;
  productId: string;
}): Promise<ProcessOrderResponse> => {
  try {
    const response = await api.post("/processOrder", {
      order_id: orderId,
      product_id: productId,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

// New API response type for the order intake API
export interface OrderIntakeResponse {
  status: string;
  message: string;
  data: {
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
  };
}

/** Panel token API: GET /getOrderOpTest/{siteId}/{orderId}?email= */
export const getOrderIntakeData = async (
  orderId: string,
  email?: string
): Promise<OrderIntakeResponse> => {
  try {
    const userEmail = email ?? storage.getUserData()?.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const response = await api.get(`/getOrderOpTest/${SITE_ID}/${orderId}`, {
      params: { email: userEmail },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
