'use client';

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
    // Only redirect when loading is complete and the user is explicitly NOT an admin.
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isLoading, router]);

  // While checking for admin status, show a full-screen loader.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is done and the user is an admin, render the layout.
  // Otherwise (not an admin), render null while the useEffect handles the redirect.
  // This prevents flashing the admin UI to non-admin users.
  return isAdmin ? <>{children}</> : null;
}
