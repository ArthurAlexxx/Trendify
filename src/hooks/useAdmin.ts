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
    () => (user && firestore ? doc(firestore, `admins/${user.uid}`) : null),
    [user, firestore]
  );

  // useDoc will return data if the document exists, and null if it doesn't.
  // The 'error' will be non-null if the read is disallowed (e.g., rules deny read for non-admins).
  const { data: adminDoc, isLoading: isAdminDocLoading, error } = useDoc(adminDocRef);

  const result = useMemo(() => {
    // Overall loading is true if auth is loading or the admin doc check is still in progress.
    const isLoading = isAuthLoading || isAdminDocLoading;
    
    // If we're done loading and there was no permission error, check if the doc exists.
    // The existence of the document (`adminDoc !== null`) confirms admin status.
    const isAdmin = !isLoading && error === null && adminDoc !== null;

    return { isAdmin, isLoading };
  }, [isAuthLoading, isAdminDocLoading, adminDoc, error]);

  return result;
}
