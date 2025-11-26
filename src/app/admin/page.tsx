
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { UserTable } from '@/components/admin/user-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

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
