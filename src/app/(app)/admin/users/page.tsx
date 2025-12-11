

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
      />

      <Card className="shadow-primary-lg">
        <CardHeader>
          <CardTitle className="text-center font-headline text-lg">Lista de Usuários</CardTitle>
           <CardDescription className="text-center">
            Use os filtros abaixo para segmentar os usuários por plano.
          </CardDescription>
           <div className="pt-4 flex justify-center">
             <Tabs value={planFilter} onValueChange={(value) => setPlanFilter(value as any)}>
              <TabsList className="bg-muted p-1">
                <TabsTrigger value="all" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Todos</TabsTrigger>
                <TabsTrigger value="free" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Gratuito</TabsTrigger>
                <TabsTrigger value="pro" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Pro</TabsTrigger>
                <TabsTrigger value="premium" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Premium</TabsTrigger>
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
