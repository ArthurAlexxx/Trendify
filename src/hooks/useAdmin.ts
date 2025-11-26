'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

/**
 * A hook to determine if the currently authenticated user has an 'admin' role
 * by checking the 'role' field in their Firestore document.
 *
 * @returns An object with `isAdmin` and `isLoading` properties.
 */
export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  
  useEffect(() => {
    // If auth is still loading, or there's no user or firestore, we are in a loading state.
    if (isUserLoading || !user || !firestore) {
      setIsLoading(true);
      return;
    }

    const checkAdminStatus = async () => {
      if (!userProfileRef) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
      }
      
      try {
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists() && docSnap.data()?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, firestore, isUserLoading, userProfileRef]);


  return { isAdmin, isLoading };
}
