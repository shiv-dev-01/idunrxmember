export interface LoginResponse {
  status: number;
  message: string;
  token?: string;
  user_id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  patientId?: string;
  existing?: number;
  gender?: string;
  error_code?: string;
  password?: string;
  month?: string;
  day?: string;
  year?: string;
}

export interface UserData {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  patientId?: string;
  gender?: string;
  existing?: number;
}