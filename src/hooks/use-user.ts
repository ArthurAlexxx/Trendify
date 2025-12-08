
'use client';

import { useFirebase } from '@/firebase';
import type { User, Auth } from 'firebase/auth';

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  auth: Auth;
  firestore: any; // Add firestore to the return type
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError, and auth.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, auth, firestore } = useFirebase();
  return { user, isUserLoading, userError, auth, firestore };
};
