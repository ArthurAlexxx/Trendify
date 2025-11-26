'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

/**
 * A hook to determine if the currently authenticated user has an 'admin' role.
 * This hook inspects the user's ID token claims.
 *
 * @returns An object with `isAdmin` and `isLoading` properties.
 */
export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // The loading state is true if the auth state is loading OR if the user exists but we haven't checked their token yet.
  const [isCheckingClaims, setIsCheckingClaims] = useState(true);

  useEffect(() => {
    // If the auth state is still loading, we can't do anything yet.
    if (isUserLoading) {
      return;
    }
    
    // If there is no user, they are definitely not an admin.
    if (!user) {
      setIsAdmin(false);
      setIsCheckingClaims(false);
      return;
    }

    // If a user exists, check their ID token for the custom claim.
    user.getIdTokenResult()
      .then((idTokenResult) => {
        // The custom claims are located in the `claims` object.
        const userClaims = idTokenResult.claims;
        
        // Check if the 'role' claim exists and is set to 'admin'.
        setIsAdmin(userClaims.role === 'admin');
      })
      .catch((error) => {
        console.error("Error getting user claims:", error);
        setIsAdmin(false);
      })
      .finally(() => {
        // Mark the claim check as complete.
        setIsCheckingClaims(false);
      });

  }, [user, isUserLoading]);

  return {
    isAdmin,
    // The final loading state depends on both the auth state and the claim checking process.
    isLoading: isUserLoading || isCheckingClaims,
  };
}
