
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';

type SubscriptionStatus = 'active' | 'inactive';
type Plan = 'pro' | 'free';

interface SubscriptionData {
  status: SubscriptionStatus;
  plan: Plan;
  expiresAt?: Timestamp;
}

interface UseSubscriptionResult {
  subscription: SubscriptionData | null;
  isLoading: boolean;
}

/**
 * A hook to get the real-time subscription status of the current user.
 * @returns {UseSubscriptionResult} An object containing the subscription data and loading state.
 */
export function useSubscription(): UseSubscriptionResult {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return { subscription: null, isLoading: true };
  }

  if (!userProfile) {
    return { subscription: { status: 'inactive', plan: 'free'}, isLoading: false };
  }

  return {
    subscription: {
      status: userProfile.subscription?.status || 'inactive',
      plan: userProfile.subscription?.plan || 'free',
      expiresAt: userProfile.subscription?.expiresAt,
    },
    isLoading: false,
  };
}

    