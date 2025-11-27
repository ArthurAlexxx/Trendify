
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

  if (isLoading) {
    return { subscription: null, isLoading: true, isTrialActive: false, trialDaysLeft: 0 };
  }
  
  if (!user) {
    return { subscription: null, isLoading: false, isTrialActive: false, trialDaysLeft: 0 };
  }

  const accountCreationDate = userProfile?.createdAt?.toDate() || new Date(user.metadata.creationTime || Date.now());
  const daysSinceCreation = differenceInDays(new Date(), accountCreationDate);
  
  // A user has a paid plan if their subscription status is active AND their plan is not 'free'
  const hasActivePaidPlan = userProfile?.subscription?.status === 'active' && userProfile.subscription.plan !== 'free';

  const isStillInTrialPeriod = daysSinceCreation < TRIAL_PERIOD_DAYS;
  const isTrialActive = isStillInTrialPeriod && !hasActivePaidPlan;

  const trialDaysLeft = Math.max(0, TRIAL_PERIOD_DAYS - daysSinceCreation);
  
  const finalPlan: Plan = isTrialActive ? 'pro' : (userProfile?.subscription?.plan || 'free');
  const finalStatus: SubscriptionStatus = (isTrialActive || hasActivePaidPlan) ? 'active' : 'inactive';

  return {
    subscription: {
      status: finalStatus,
      plan: finalPlan,
      expiresAt: userProfile?.subscription?.expiresAt || undefined,
    },
    isLoading: false,
    isTrialActive: isTrialActive,
    trialDaysLeft: trialDaysLeft,
  };
}
