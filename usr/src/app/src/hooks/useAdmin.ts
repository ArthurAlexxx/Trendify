
'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

/**
 * A hook to determine if the currently authenticated user has an 'admin' role
 * by checking the 'role' field in their Firestore document.
 * This hook is designed to prevent "false negatives" by maintaining a loading state
 * until the Firestore check is complete.
 *
 * @returns An object with `isAdmin` and `isLoading` properties.
 */
export function useAdmin() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    // If auth is loading, or there's no user or firestore, we are in a loading state.
    if (isAuthLoading || !user || !firestore) {
      // Keep loading state true until we have a user and firestore instance
      setIsCheckingRole(true);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists() && docSnap.data()?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setIsAdmin(false);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user, firestore, isAuthLoading]);

  // The overall loading state is true if auth is loading OR the role check is in progress.
  const isLoading = isAuthLoading || isCheckingRole;

  return { isAdmin, isLoading };
}
