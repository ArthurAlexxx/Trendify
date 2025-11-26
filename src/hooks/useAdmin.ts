
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import type { UserProfile } from '@/lib/types';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * A hook to check if the current user has admin privileges.
 * It checks for the `role` field in the user's profile document.
 *
 * @returns {UseAdminResult} An object containing the admin status and loading state.
 */
export function useAdmin(): UseAdminResult {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Reference to the user's profile document in the 'users' collection.
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const result = useMemo(() => {
    // Loading is true if auth is loading or the profile document is still loading.
    const isLoading = isAuthLoading || isProfileLoading;
    
    // If not loading, check if the userProfile data exists and has the admin role.
    const isAdmin = !isLoading && !!userProfile && userProfile.role === 'admin';

    return { isAdmin, isLoading };
  }, [isAuthLoading, isProfileLoading, userProfile]);

  return result;
}
