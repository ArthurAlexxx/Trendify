
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
    // Apenas redireciona quando o carregamento terminar e o usuário explicitamente NÃO for um admin.
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
    // Redireciona para o dashboard de admin se for admin e estiver na raiz /admin
    if (!isLoading && isAdmin && window.location.pathname === '/admin') {
      router.replace('/admin/dashboard');
    }
  }, [isAdmin, isLoading, router]);

  // Enquanto verifica o status de admin, mostra um loader de tela cheia.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o carregamento terminou e o usuário é admin, renderiza o layout.
  // Caso contrário (não é admin), renderiza null enquanto o useEffect cuida do redirect.
  // Isso evita piscar a UI de admin para usuários não-admins.
  return isAdmin ? <>{children}</> : null;
}
