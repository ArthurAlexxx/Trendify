
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { UserTable } from '@/components/admin/user-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { useState } from 'react';
import { Users, Crown, Sparkles } from 'lucide-react';

export default function AdminPage() {
  const firestore = useFirestore();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro' | 'premium'>('all');

  const usersQuery = useMemoFirebase(
    () => {
      if (!firestore || !isAdmin) return null;
      
      const baseQuery = collection(firestore, 'users');
      if (planFilter === 'all') {
        return baseQuery;
      }
      return query(baseQuery, where('subscription.plan', '==', planFilter));
    },
    [firestore, isAdmin, planFilter]
  );
  
  const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  const isLoading = isAdminLoading || (isAdmin && isUsersLoading);

  const totalUsers = users?.length || 0;
  const proUsers = users?.filter(u => u.subscription?.plan === 'pro').length || 0;
  const premiumUsers = users?.filter(u => u.subscription?.plan === 'premium').length || 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel de Administração"
        description="Gerencie usuários e veja as estatísticas da plataforma."
      />

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Pro</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : proUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : premiumUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <UserTable data={users || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
