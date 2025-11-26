'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

/**
 * A hook to determine if the currently authenticated user has an 'admin' role
 * by checking the custom claims on their Firebase ID token.
 *
 * @returns An object with `isAdmin` and `isLoading` properties.
 */
export function useAdmin() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    // If auth is still loading, we can't check claims yet.
    if (isAuthLoading) {
      return;
    }
    
    // If there is no user, they are definitely not an admin.
    if (!user) {
      setIsAdmin(false);
      setIsClaimsLoading(false);
      return;
    }

    // When the user object is available, get their ID token result.
    // The `true` argument forces a refresh of the token to get the latest claims.
    user.getIdTokenResult(true)
      .then((idTokenResult) => {
        // Custom claims are on the `claims` object.
        // Check for the 'role' claim.
        const userClaims = idTokenResult.claims;
        setIsAdmin(userClaims.role === 'admin');
      })
      .catch((error) => {
        console.error("Erro ao buscar as permissões do usuário:", error);
        setIsAdmin(false);
      })
      .finally(() => {
        // Mark claims checking as complete.
        setIsClaimsLoading(false);
      });

  }, [user, isAuthLoading]);

  return {
    isAdmin,
    // The overall loading state is true until both auth and claims are resolved.
    isLoading: isAuthLoading || isClaimsLoading,
  };
}
