
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
  cycle?: 'monthly' | 'annual';
  expiresAt?: Timestamp | null;
  asaasSubscriptionId?: string | null;
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

  if (isLoading || !userProfile) {
    return {
      subscription: null,
      isLoading: true,
      isTrialActive: false,
      trialDaysLeft: 0,
    };
  }

  const { subscription, createdAt } = userProfile;
  const now = new Date();

  // Check for active subscription first
  if (subscription && subscription.status === 'active' && subscription.plan !== 'free') {
      const expiresAtDate = subscription.expiresAt?.toDate();
      if (expiresAtDate && expiresAtDate > now) {
          return {
              subscription: {
                  status: 'active',
                  plan: subscription.plan,
                  cycle: subscription.cycle,
                  expiresAt: subscription.expiresAt,
                  asaasSubscriptionId: subscription.asaasSubscriptionId,
              },
              isLoading: false,
              isTrialActive: false,
              trialDaysLeft: 0,
          };
      }
  }

  // If no active subscription, check for trial period
  const createdAtDate = createdAt.toDate();
  const trialEndDate = new Date(createdAtDate.getTime() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const trialDaysLeft = differenceInDays(trialEndDate, now);
  const isTrialActive = trialDaysLeft > 0;

  if (isTrialActive) {
       return {
            subscription: {
                status: 'active',
                plan: 'pro', // Trial gives PRO access
            },
            isLoading: false,
            isTrialActive: true,
            trialDaysLeft,
        };
  }
  
  // If subscription is inactive but was previously paid
  if (subscription && subscription.status === 'inactive' && subscription.plan !== 'free') {
    return {
      subscription: {
          status: 'inactive',
          plan: subscription.plan,
          cycle: subscription.cycle,
          expiresAt: subscription.expiresAt,
          asaasSubscriptionId: subscription.asaasSubscriptionId,
      },
      isLoading: false,
      isTrialActive: false,
      trialDaysLeft: 0,
    };
  }

  // Default to free plan if no active subscription and trial is over
  return {
    subscription: {
      status: 'inactive',
      plan: 'free',
    },
    isLoading: false,
    isTrialActive: false,
    trialDaysLeft: 0,
  };
}
