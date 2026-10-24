import axios from "axios";
import type { LoginResponse } from "../types/auth";
import { api, ensureCsrfCookieIfNeeded } from "./api/config";

export const loginUser = async (
  email: string,
  password: string,
  isMagic?: boolean
): Promise<LoginResponse> => {
  try {
    await ensureCsrfCookieIfNeeded();

    const payload: Record<string, string | number> = {
      email,
      password,
    };

    if (isMagic) {
      payload.is_magic = 1;
    }

    const response = await api.post("/user_login", payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const logoutUser = async (
  email: string
): Promise<{ status: number; message?: string }> => {
  try {
    const response = await api.post("/user_logout", { email });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const changePassword = async (
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<LoginResponse> => {
  try {
    const response = await api.post("/change_password_new", {
      email,
      old_password: oldPassword,
      password: newPassword,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getUserPassword = async (
  email: string
): Promise<{ password: string; status: number; message: string }> => {
  try {
    const response = await api.post("/get_user_password", {
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

export const updatePassword = async ({
  userId,
  email,
  oldPassword,
  newPassword,
}: {
  userId: number;
  email: string;
  oldPassword: string;
  newPassword: string;
}): Promise<{ status: number; message: string }> => {
  try {
    const response = await api.post("/change_password", {
      user_id: userId,
      email,
      password: newPassword,
      old_password: oldPassword,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
