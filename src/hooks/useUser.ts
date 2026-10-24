import { storage } from '../utils/storage';

export function useUser() {
  const userData = storage.getUserData();

  return {
    name: userData?.firstName && userData?.lastName 
      ? `${userData.firstName} ${userData.lastName}`
      : 'User', // Default name if no data is found
    email: userData?.email || 'user@example.com', // Default email if no data is found
    initials: userData?.firstName && userData?.lastName
      ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`
      : 'U', // Default initials if no data is found
  };
}