
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/useAdmin';
import { Users, Crown, Sparkles, DollarSign } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useMemo } from 'react';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const chartConfig = {
  users: {
    label: 'Usuários',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const PLAN_PRICES = {
    pro: { monthly: 29, annual: 299 },
    premium: { monthly: 39, annual: 399 },
};


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
  
  const userGrowthData = useMemo(() => {
    if (!users || users.length === 0) {
        // If there are no users, create a placeholder for the last 7 days with 0 users
        const today = new Date();
        return Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(today, 6 - i);
            return {
                date: format(date, 'dd/MM'),
                users: 0,
            };
        });
    }

    const sortedUsers = [...users].sort((a, b) => (a.createdAt as any).toDate().getTime() - (b.createdAt as any).toDate().getTime());
    
    const dailyCounts: { [date: string]: number } = {};
    sortedUsers.forEach(user => {
      if (user.createdAt) {
        const date = format(startOfDay((user.createdAt as any).toDate()), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    });

    let cumulativeUsers = 0;
    const chartData = Object.keys(dailyCounts).sort().map(dateStr => {
        cumulativeUsers += dailyCounts[dateStr];
        return {
            date: format(new Date(dateStr), 'dd/MM'),
            users: cumulativeUsers,
        }
    });

    return chartData;

  }, [users]);
  
  const monthlyRecurringRevenue = useMemo(() => {
    if (!users) return 0;
    
    return users.reduce((total, user) => {
        if (user.subscription?.status === 'active') {
            const plan = user.subscription.plan;
            const cycle = user.subscription.cycle;

            if (plan === 'pro' && PLAN_PRICES.pro) {
                return total + (cycle === 'annual' ? PLAN_PRICES.pro.annual / 12 : PLAN_PRICES.pro.monthly);
            }
            if (plan === 'premium' && PLAN_PRICES.premium) {
                return total + (cycle === 'annual' ? PLAN_PRICES.premium.annual / 12 : PLAN_PRICES.premium.monthly);
            }
        }
        return total;
    }, 0);
  }, [users]);


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
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className='h-8 w-24' /> : 
                    monthlyRecurringRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})
                }
            </div>
            <p className="text-xs text-muted-foreground">Estimativa de receita recorrente</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
            <CardDescription>Visualização do número cumulativo de usuários ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <Skeleton className="h-80 w-full" />
             ) : (
                <ChartContainer config={chartConfig} className="h-80 w-full">
                <AreaChart
                    accessibilityLayer
                    data={userGrowthData}
                    margin={{
                        left: 12,
                        right: 12,
                    }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value}
                    />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                    dataKey="users"
                    type="natural"
                    fill="var(--color-users)"
                    fillOpacity={0.4}
                    stroke="var(--color-users)"
                    />
                </AreaChart>
                </ChartContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
