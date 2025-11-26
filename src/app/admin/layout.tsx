
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    // If not loading and the user is not an admin, redirect them.
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isLoading, router]);

  // While checking for admin status, show a loader.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is an admin, render the layout.
  // If not, render null while the redirect happens.
  return isAdmin ? (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full md:pl-64">
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            {children}
        </main>
      </div>
    </div>
  ): null;
}
