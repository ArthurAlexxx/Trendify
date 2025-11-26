
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * A hook to check if the current user has admin privileges.
 * It checks for the existence of a document in the 'admins' collection
 * with the user's UID as the document ID.
 *
 * @returns {UseAdminResult} An object containing the admin status and loading state.
 */
export function useAdmin(): UseAdminResult {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Memoize the document reference to prevent re-renders
  const adminDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `admins/${user.uid}`) : null),
    [user, firestore]
  );

  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminDocRef);

  const isLoading = isUserLoading || isAdminDocLoading;
  
  // The user is an admin if the document exists.
  // We don't need to check the content of the document.
  const isAdmin = !!adminDoc;

  return { isAdmin, isLoading };
}
