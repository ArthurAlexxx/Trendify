
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdmin } from '@/hooks/useAdmin';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        // Se o carregamento terminou e não há usuário, redireciona para o login.
        router.push('/login');
      } else if (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        // Se o usuário está logado via e-mail/senha mas não está verificado,
        // redireciona para o login e mostra uma notificação.
        toast({
            title: "Verificação Necessária",
            description: "Por favor, confirme seu e-mail para acessar a plataforma.",
            variant: "destructive"
        });
        auth.signOut(); // Força o logout
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router, toast, auth]);

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

  // Enquanto verifica o usuário, a verificação, ou o status de admin, mostra um loader.
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Se não há usuário ou o e-mail não foi verificado (para provedor de senha), não renderiza o layout.
  // O useEffect acima cuidará do redirecionamento.
  if (!user || (!user.emailVerified && user.providerData.some(p => p.providerId === 'password'))) {
      return null;
  }

  // Redireciona admin para o painel de admin se ele estiver em páginas de usuário.
  if (isAdmin && !pathname.startsWith('/admin')) {
      router.replace('/admin');
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  // Renderiza o layout do aplicativo para usuários autenticados e verificados.
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
