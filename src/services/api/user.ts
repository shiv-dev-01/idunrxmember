import axios from 'axios';
import type { UserProfileResponse } from '../../types/user';
import { api } from './config';

export const getUserProfileData = async (
  email: string
): Promise<UserProfileResponse> => {
  try {
    const response = await api.post('/user_details', {
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

export const forgotPassword = async (email: string): Promise<any> => {
  try {
    const response = await api.post('/forgot_password', { email });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const sendMagicLink = async (email: string): Promise<any> => {
  try {
    const response = await api.post('/magic_link', { email });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};