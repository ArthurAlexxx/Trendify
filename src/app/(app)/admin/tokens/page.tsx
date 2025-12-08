
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, User, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';

const TOKEN_LIMIT = 50;

export default function TokensAdminPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), orderBy('tokenUsage', 'desc')) : null,
    [firestore]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const totalTokensUsed = useMemo(() => {
    return users?.reduce((acc, user) => acc + (user.tokenUsage || 0), 0) || 0;
  }, [users]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Uso de Tokens"
        description="Acompanhe o consumo de tokens da API de sincronização."
        icon={Coins}
      />

       <Card className="shadow-primary-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens Usados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-24' /> : totalTokensUsed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Soma de todos os tokens usados por todos os usuários.</p>
          </CardContent>
        </Card>

      <Card className="shadow-primary-lg">
        <CardHeader>
          <CardTitle className="text-center">Consumo por Usuário</CardTitle>
          <CardDescription className="text-center">
            Lista de usuários e seu respectivo consumo de tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
           ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tokens Usados</TableHead>
                    <TableHead className="w-[30%]">Progresso até o Limite</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users && users.map((user) => (
                    <TableRow key={user.id}>
                       <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL ?? undefined} />
                                <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className='font-semibold'>{user.displayName}</p>
                                <p className='text-xs text-muted-foreground'>{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='font-mono text-lg'>{user.tokenUsage || 0}</TableCell>
                        <TableCell>
                            <div className='flex items-center gap-3'>
                                <Progress value={((user.tokenUsage || 0) / TOKEN_LIMIT) * 100} className="h-2" />
                                <span className='text-xs font-mono text-muted-foreground'>{(((user.tokenUsage || 0) / TOKEN_LIMIT) * 100).toFixed(0)}%</span>
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
             </Table>
           )}
           {!isLoading && (!users || users.length === 0) && (
             <div className="text-center py-20">
                <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
