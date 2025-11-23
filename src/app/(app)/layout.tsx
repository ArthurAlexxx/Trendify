
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Once loading is complete and we have a user, render the app layout.
  return (
    <div className="min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="md:pl-64">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <PanelLeft />
                        <span className="sr-only">Abrir menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                    <AppSidebar />
                </SheetContent>
              </Sheet>
            </header>
            <main className="p-4 sm:p-6 md:p-8 w-full">{children}</main>
        </div>
    </div>
  );
}
