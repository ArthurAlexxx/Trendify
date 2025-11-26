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
    // Apenas redireciona quando o carregamento estiver completo e o usuário NÃO for admin.
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isLoading, router]);

  // Durante o carregamento, mostra um loader em tela cheia.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o carregamento terminou e o usuário é admin, renderiza o layout.
  // Caso contrário (não é admin), renderiza null enquanto o useEffect cuida do redirecionamento.
  return isAdmin ? (
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
  ) : null;
}
