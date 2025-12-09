'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if loading is complete and user is logged in
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // If the user state is still loading, show a full-screen loader.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a user is already logged in, show a loader while redirecting to avoid flashing content.
  if (user) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished and there's no user, show the login/signup page.
  return <>{children}</>;
}
