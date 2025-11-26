
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useMemo } from 'react';

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
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const result = useMemo(() => {
    // The overall loading state is true if auth is loading or profile is loading.
    const isLoading = isAuthLoading || isProfileLoading;
    
    // Determine admin status only if not loading.
    const isAdmin = !isLoading && userProfile?.role === 'admin';

    return { isAdmin, isLoading };
  }, [isAuthLoading, isProfileLoading, userProfile]);

  return result;
}

