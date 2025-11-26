
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * A hook to check if the current user has admin privileges.
 * It checks for the existence of a document in `/admins/{userId}`.
 *
 * @returns {UseAdminResult} An object containing the admin status and loading state.
 */
export function useAdmin(): UseAdminResult {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Reference to the user's document in the 'admins' collection.
  const adminDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `admins/${user.uid}`) : null),
    [user, firestore]
  );

  // useDoc will return data if the document exists, and null if it doesn't.
  // It also handles loading states for us.
  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminDocRef);

  const result = useMemo(() => {
    // The overall loading state is true if auth is loading or the admin doc check is loading.
    const isLoading = isAuthLoading || isAdminDocLoading;
    
    // An admin is someone who is not loading and has a document in the 'admins' collection.
    // 'adminDoc' will be non-null if the document exists.
    const isAdmin = !isLoading && adminDoc !== null;

    return { isAdmin, isLoading };
  }, [isAuthLoading, isAdminDocLoading, adminDoc]);

  return result;
}

    