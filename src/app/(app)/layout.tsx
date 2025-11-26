
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdmin } from '@/hooks/useAdmin';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/login');
    }

    // If user is an admin and they land on the regular dashboard, redirect them to the admin panel.
    if (!isAdminLoading && isAdmin && pathname === '/dashboard') {
        router.replace('/admin');
    }

  }, [user, isUserLoading, router, isAdmin, isAdminLoading, pathname]);

  // Global error handler for ChunkLoadError
  useEffect(() => {
    const handleChunkLoadError = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        console.warn('ChunkLoadError detected, forcing page reload.');
        window.location.reload();
      }
    };

    window.addEventListener('unhandledrejection', handleChunkLoadError);

    return () => {
      window.removeEventListener('unhandledrejection', handleChunkLoadError);
    };
  }, []);


  // While checking for user auth, show a full-screen loader.
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is done and there's no user, we render nothing because the
  // useEffect above will handle the redirect. This prevents showing a glimpse
  // of the app layout before redirecting.
  if (!user) {
      return null;
  }

  // If we reach here, user is logged in and not loading. Render the app.
  return (
    <div className="flex min-h-screen w-full bg-background">
        <AppSidebar isMobile={false} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex flex-col flex-1 w-full md:pl-64">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0">
                  <AppSidebar isMobile setIsMobileMenuOpen={setIsMobileMenuOpen} />
                </SheetContent>
            </Sheet>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            {children}
            </main>
        </div>
    </div>
  );
}
