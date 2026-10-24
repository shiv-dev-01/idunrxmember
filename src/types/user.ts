export interface UserAddress {
  address: string;
  zip_code: string;
  city_name: string;
  state_name: string;
  state_code?: string;
  country: string;
}

export interface UserDetails {
  id?: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  phone_number: string;
  email: string;
  dob?: string | null;
  created_at?: string;
  updated_at?: string;
  user_address_data?: UserAddress[];
}

export interface UserProfileResponse {
  status: number;
  message: string;
  user_details: UserDetails;
}
