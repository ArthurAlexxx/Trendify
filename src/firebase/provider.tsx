
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useToast } from '@/hooks/use-toast';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check AND async profile operations
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  auth: Auth;
  firestore: Firestore;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Ensures a user profile exists in Firestore and has a role. If not, it creates or updates one.
 * @param firestore The Firestore instance.
 * @param user The authenticated Firebase user.
 */
async function ensureUserProfile(firestore: Firestore, user: User) {
    const userRef = doc(firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        console.log(`[FirebaseProvider] No profile found for UID: ${user.uid}. Creating new one.`);
        const { displayName, email, photoURL } = user;
        await setDoc(userRef, {
            displayName,
            email,
            photoURL,
            createdAt: serverTimestamp(),
            role: 'user', // Default role for new users
            subscription: {
                status: 'inactive',
                plan: 'free',
            },
        });
        console.log(`[FirebaseProvider] New user profile created for UID: ${user.uid}`);
    } else {
      // If the document exists, check if the 'role' field is missing.
      if (docSnap.data().role === undefined) {
        console.log(`[FirebaseProvider] Profile for UID: ${user.uid} is missing 'role'. Updating.`);
        await updateDoc(userRef, {
          role: 'user'
        });
        console.log(`[FirebaseProvider] 'role' field added to existing profile for UID: ${user.uid}`);
      }
    }
}


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const { toast } = useToast();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event is fully processed
    userError: null,
  });

  // This effect handles the auth state changes.
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        // This is the primary listener for auth state.
        if (firebaseUser) {
          try {
            // A user is detected. Now we ensure their profile exists in Firestore.
            await ensureUserProfile(firestore, firebaseUser);
            // ONLY after the profile is guaranteed to exist, we update the state.
            setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
          } catch (error) {
            console.error('[FirebaseProvider] Error during profile creation/update:', error);
            setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: error as Error });
          }
        } else {
          // No user is signed in. Stop loading.
          setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    
    // Separately, handle the result from a Google Sign-In redirect.
    // This runs once after a redirect and lets onAuthStateChanged handle the final state.
    getRedirectResult(auth).catch((error) => {
      if (error.code !== 'auth/no-redirect-operation') {
        console.error("FirebaseProvider: Google redirect result error:", error);
        toast({ title: 'Erro no Login', description: 'Não foi possível completar o login com Google.', variant: 'destructive' });
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [auth, firestore, toast]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, auth, firestore } = useFirebase();
  return { user, isUserLoading, userError, auth, firestore };
};
