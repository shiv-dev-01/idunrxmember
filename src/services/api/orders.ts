import axios from "axios";
import type {
  OrderDetailsResponse,
  OrdersResponse,
  OrderOpTestResponse,
} from "../../types/orders";
import {
  api,
  mdIntegrationsApi,
} from "./config";
import { storage } from "../../utils/storage";

const SITE_ID = import.meta.env.VITE_WHITELABEL_SITE_ID ?? "314";

export const getUserOrders = async (
  userId: number,
  email: string
): Promise<OrdersResponse> => {
  try {
    const response = await api.post("/get_user_conform_cart_product", {
      user_id: userId,
      email,
    });

    // Save the product category if available in the first order
    if (
      response.data.status === 1 &&
      response.data.product?.[0]?.product_category_name
    ) {
      storage.setProductCategory(
        response.data.product[0].product_category_name
      );
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getOrderDetails = async (
  orderId: string
): Promise<OrderDetailsResponse> => {
  try {
    const response = await api.post("/get_user_cart_product_details", {
      order_id: orderId,
    });

    // Update product category if available
    if (
      response.data.status === 1 &&
      response.data.product?.[0]?.product_category_name
    ) {
      storage.setProductCategory(
        response.data.product[0].product_category_name
      );
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/** Panel token API: GET /getOrderOpTest/{siteId}/{orderId}?email= */
export const callOrderOpTest = async (
  orderId: string,
  email?: string
): Promise<any> => {
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

export const getOrderOpTestData = async (
  orderId: string,
  email?: string
): Promise<OrderOpTestResponse> => {
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

export interface UploadFileResponse {
  status: string;
  message: string;
  data?: any;
}

export const uploadFullBodyImage = async (
  orderId: string,
  file: File
): Promise<UploadFileResponse> => {
  return uploadImageFile(orderId, file, "FULLBODY");
};

export const uploadIdImage = async (
  orderId: string,
  file: File
): Promise<UploadFileResponse> => {
  return uploadImageFile(orderId, file, "ID");
};

export const uploadPrescriptionImage = async (
  orderId: string,
  file: File
): Promise<UploadFileResponse> => {
  return uploadImageFile(orderId, file, "PRESCRIPTION");
};

/** POST /uploadFile — multipart FormData to idunrx_token_v2 */
export const uploadImageFile = async (
  orderId: string,
  file: File,
  uploadName: "FULLBODY" | "ID" | "PRESCRIPTION"
): Promise<UploadFileResponse> => {
  try {
    const email = storage.getUserData()?.email;
    if (!email) {
      throw new Error("User email not found");
    }

    const formData = new FormData();
    formData.append("user", "user");
    formData.append("upload_name", uploadName);
    formData.append("site_id", SITE_ID);
    formData.append("order_id", orderId);
    formData.append("email", email);
    formData.append("file", file);

    const response = await api.post("/uploadFile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export interface IdentityRecheckRequest {
  user: string;
  debug: number;
  last4: string;
}

export interface IdentityRecheckResponse {
  status: string;
  message: string;
  data?: any;
}

export const submitIdentityRecheck = async (
  orderId: string,
  last4: string
): Promise<IdentityRecheckResponse> => {
  try {
    const requestBody: IdentityRecheckRequest = {
      user: "user",
      debug: 0,
      last4: last4,
    };

    const response = await mdIntegrationsApi.post(
      `/order/${orderId}/identity-recheck-with-ssn`,
      requestBody
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
