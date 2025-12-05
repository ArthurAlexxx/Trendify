'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { UserTable } from '@/components/admin/user-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
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
  
  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Visualize, filtre e gerencie todos os usuários."
        icon={Users}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
           <CardDescription>
            Use os filtros abaixo para segmentar os usuários por plano.
          </CardDescription>
           <div className="pt-4">
             <Tabs value={planFilter} onValueChange={(value) => setPlanFilter(value as any)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="free">Gratuito</TabsTrigger>
                <TabsTrigger value="pro">Pro</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
              </TabsList>
            </Tabs>
           </div>
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
