
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2, PanelLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  if (!isAdmin) {
    return null;
  }

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
