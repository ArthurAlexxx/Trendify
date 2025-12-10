
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AppSidebar isMobile={false} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex flex-col flex-1 w-full md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
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
        <main className="flex-1 p-4 sm:px-6 sm:py-8 md:p-8 overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AppLayoutContent>
                {children}
            </AppLayoutContent>
        </Suspense>
    )
}
