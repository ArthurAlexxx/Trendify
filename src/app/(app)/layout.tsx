
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
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background/95 w-full">
          {isMobile && (
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 sm:px-6">
              <SidebarTrigger variant="outline" size="icon" className="sm:hidden">
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
