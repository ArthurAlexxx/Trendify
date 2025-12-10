
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { Users, Crown, Sparkles, DollarSign, LineChart, LayoutGrid } from 'lucide-react';
import { useMemo } from 'react';
import { AreaChart, Area, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format } from 'date-fns';

const chartConfig = {
  users: {
    label: 'Usuários',
    color: 'hsl(var(--primary))',
  },
}

export default function AdminDashboardPage() {
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
  
  const mrr = useMemo(() => {
    if (!users) return 0;
    return users.reduce((acc, user) => {
        if (user.subscription?.status === 'active') {
            if (user.subscription.plan === 'pro') {
                return acc + (user.subscription.cycle === 'annual' ? 299 / 12 : 29);
            }
            if (user.subscription.plan === 'premium') {
                return acc + (user.subscription.cycle === 'annual' ? 399 / 12 : 39);
            }
        }
        return acc;
    }, 0);
  }, [users]);
  
  const userGrowthData = useMemo(() => {
    if (!users) return [];
    const sortedUsers = [...users].sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    const data: { date: string, users: number }[] = [];
    sortedUsers.forEach((user, index) => {
        data.push({
            date: format(user.createdAt.toDate(), 'dd/MM'),
            users: index + 1
        });
    });
    return data;
  }, [users]);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard de Administração"
        description="Métricas e visão geral da plataforma."
      />

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-primary-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalUsers}</div>
            <p className="text-xs text-muted-foreground">{freeUsers} gratuitos</p>
          </CardContent>
        </Card>
        <Card className="shadow-primary-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Pro</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : proUsers}</div>
            <p className="text-xs text-muted-foreground">Plano Pro ativo</p>
          </CardContent>
        </Card>
        <Card className="shadow-primary-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : premiumUsers}</div>
            <p className="text-xs text-muted-foreground">Plano Premium ativo</p>
          </CardContent>
        </Card>
        <Card className="shadow-primary-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-24' /> : mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
             <p className="text-xs text-muted-foreground">Receita mensal recorrente estimada.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="shadow-primary-lg">
          <CardHeader>
            <CardTitle className="text-center">
              Crescimento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : 
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={userGrowthData}>
                <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area type="monotone" dataKey="users" stroke="var(--color-users)" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ChartContainer>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
