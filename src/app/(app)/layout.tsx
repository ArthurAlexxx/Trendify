
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Only redirect if loading is complete and there is definitively no user.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // While loading, or if there's no user yet (and not finished loading), show a loader.
  // This prevents a flash of the login page or protected content.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Once loading is complete and we have a user, render the app layout.
  return (
    <SidebarProvider>
      <div className="relative min-h-screen w-full flex bg-gray-900 text-gray-200">
         <div className="shape-1"></div>
         <div className="shape-2"></div>
        <AppSidebar />
        <SidebarInset className="w-full bg-transparent">
          {isMobile && (
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-white/10 bg-gray-900/50 px-4 sm:px-6 backdrop-blur-sm">
              <SidebarTrigger variant="outline" size="icon" className="sm:hidden bg-transparent border-gray-700 text-white hover:bg-white/10 hover:text-white">
                <PanelLeft />
                <span className="sr-only">Abrir menu</span>
              </SidebarTrigger>
            </header>
          )}
          <div className="p-4 sm:p-6 md:p-8 w-full">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
