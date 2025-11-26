
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { Users, Crown, Sparkles } from 'lucide-react';

export default function AdminPage() {
  const firestore = useFirestore();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();

  // Query for all users, only if the current user is an admin
  const allUsersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin]
  );
  const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(allUsersQuery);

  const isLoading = isAdminLoading || (isAdmin && isUsersLoading);

  const totalUsers = users?.length || 0;
  const proUsers = users?.filter(u => u.subscription?.plan === 'pro' && u.subscription.status === 'active').length || 0;
  const premiumUsers = users?.filter(u => u.subscription?.plan === 'premium' && u.subscription.status === 'active').length || 0;
  const freeUsers = totalUsers - proUsers - premiumUsers;


  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard de Administração"
        description="Métricas e visão geral da plataforma."
      />

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalUsers}</div>
            <p className="text-xs text-muted-foreground">{freeUsers} gratuitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Pro</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : proUsers}</div>
            <p className="text-xs text-muted-foreground">Plano Pro ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : premiumUsers}</div>
            <p className="text-xs text-muted-foreground">Plano Premium ativo</p>
          </CardContent>
        </Card>
      </div>

       {/* Placeholder for future charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
             <p className="text-xs text-muted-foreground mt-2 text-center">Gráfico de crescimento de usuários (em breve).</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
             <p className="text-xs text-muted-foreground mt-2 text-center">Gráfico de receita mensal recorrente (em breve).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
