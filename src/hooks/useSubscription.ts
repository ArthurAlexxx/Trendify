
'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { UserProfile, Plan } from '@/lib/types';
import { doc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';

type SubscriptionStatus = 'active' | 'inactive';

interface SubscriptionData {
  status: SubscriptionStatus;
  plan: Plan;
  expiresAt?: Timestamp;
}

interface UseSubscriptionResult {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
}

const TRIAL_PERIOD_DAYS = 2;

/**
 * A hook to get the real-time subscription status and trial period of the current user.
 * @returns {UseSubscriptionResult} An object containing subscription data, loading state, and trial status.
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

  // Temporarily grant everyone premium access.
  return {
    subscription: {
      status: 'active',
      plan: 'premium',
    },
    isLoading: false,
    isTrialActive: false,
    trialDaysLeft: 0,
  };
}
