
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { UserTable } from '@/components/admin/user-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminPage() {
  const firestore = useFirestore();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();

  // Only execute the query if the user is confirmed to be an admin
  const usersQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'users') : null),
    [firestore, isAdmin]
  );
  
  // The isLoading state from useCollection will be true until isAdmin is true and the query runs
  const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  const isLoading = isAdminLoading || (isAdmin && isUsersLoading);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel de Administração"
        description="Gerencie usuários e veja as estatísticas da plataforma."
      />

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
