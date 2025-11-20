'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Circle,
  Plus,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Metrica, PontoDadosGrafico, ItemRoteiro } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  alcance: {
    label: 'Alcance',
    color: 'hsl(var(--chart-1))',
  },
  engajamento: {
    label: 'Engajamento',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const firestore = useFirestore();

  const metricaQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'metrica') : null),
    [firestore]
  );
  const { data: metrica, isLoading: isLoadingMetrica } =
    useCollection<Metrica>(metricaQuery);

  const dadosGraficoQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'dadosGrafico') : null),
    [firestore]
  );
  const { data: dadosGrafico, isLoading: isLoadingDadosGrafico } =
    useCollection<PontoDadosGrafico>(dadosGraficoQuery);

  const roteiroQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roteiro') : null),
    [firestore]
  );
  const { data: roteiro, isLoading: isLoadingRoteiro } =
    useCollection<ItemRoteiro>(roteiroQuery);

  return (
    <>
      <PageHeader
        title="Bem-vindo de volta, Criador!"
        description="Aqui está um resumo do seu progresso e seu plano de conteúdo para a semana."
      >
        <Button className="font-manrope">
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoadingMetrica
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))
            : metrica?.map((metric) => (
                <Card key={metric.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.nome}
                    </CardTitle>
                    {metric.tipoAlteracao === 'aumento' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.valor}</div>
                    <p
                      className={cn(
                        'text-xs text-muted-foreground',
                        metric.tipoAlteracao === 'aumento'
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      )}
                    >
                      {metric.alteracao} da semana passada
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Desempenho Semanal</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              {isLoadingDadosGrafico ? (
                <div className="h-[250px] w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="h-[250px] w-full"
                >
                  <BarChart accessibilityLayer data={dadosGrafico}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="data"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(value) =>
                        typeof value === 'number' && value >= 1000
                          ? `${value / 1000}k`
                          : value
                      }
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                      dataKey="alcance"
                      fill="var(--color-alcance)"
                      radius={4}
                      className="fill-primary"
                    />
                    <Bar
                      dataKey="engajamento"
                      fill="var(--color-engajamento)"
                      radius={4}
                      className="fill-pink-400"
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Roteiro de Conteúdo Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRoteiro ? (
                 <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-4">
                  {roteiro?.map((item, index) => (
                    <li key={item.id}>
                      <div className="flex items-start gap-4">
                        {item.concluido ? (
                          <CheckCircle className="h-5 w-5 mt-0.5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 mt-0.5 text-muted-foreground/50" />
                        )}
                        <div>
                          <p className="font-medium">
                            <span className="font-semibold">{item.dia}:</span> {item.tarefa}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.detalhes}
                          </p>
                        </div>
                      </div>
                      {roteiro && index < roteiro.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
