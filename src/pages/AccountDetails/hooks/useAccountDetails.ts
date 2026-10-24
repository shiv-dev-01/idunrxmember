import { useState, useEffect } from 'react';
import { getUserProfileData } from '../../../services/api';
import { storage } from '../../../utils/storage';
import type { UserProfileResponse } from '../../../types/user';

export function useAccountDetails() {
  const [accountDetails, setAccountDetails] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const userData = storage.getUserData();
        if (!userData?.email) {
          throw new Error('User data not found');
        }

        const response = await getUserProfileData(userData.email);

        if (response.status === 1 && response.user_details) {
          setAccountDetails(response);
        } else {
          throw new Error(response.message || 'Failed to fetch account details');
        }
      } catch (error: any) {
        console.error('Failed to fetch account details:', error);
        setError(error.message || 'Failed to fetch account details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountDetails();
  }, []);

  return { accountDetails, isLoading, error };
}
