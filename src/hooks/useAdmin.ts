
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * A hook to check if the current user has admin privileges.
 * It checks for `role === 'admin'` on the user's own profile document.
 *
 * @returns {UseAdminResult} An object containing the admin status and loading state.
 */
export function useAdmin(): UseAdminResult {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Memoize the document reference to prevent re-renders
  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;
  
  // The user is an admin if their profile document has role === 'admin'.
  const isAdmin = userProfile?.role === 'admin';

  return { isAdmin, isLoading };
}
