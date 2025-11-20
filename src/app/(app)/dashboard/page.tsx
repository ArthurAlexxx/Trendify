'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Plus,
  Rocket,
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
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type {
  Metrica,
  PontoDadosGrafico,
  ItemRoteiro,
  IdeiaSalva,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const { user } = useUser();

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

  const ideiasSalvasQuery = useMemoFirebase(
    () =>
      firestore && user
        ? collection(firestore, `users/${user.uid}/ideiasSalvas`)
        : null,
    [firestore, user]
  );
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } =
    useCollection<IdeiaSalva>(ideiasSalvasQuery);

  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    if (!firestore || !user) return;
    const ideiaRef = doc(
      firestore,
      `users/${user.uid}/ideiasSalvas`,
      ideia.id
    );
    try {
      await updateDoc(ideiaRef, { concluido: !ideia.concluido });
    } catch (error) {
      console.error("Failed to update idea status:", error);
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title={`Bem-vindo(a) de volta, ${user?.displayName?.split(' ')[0] || 'Criador'}!`}
        description="Aqui está um resumo do seu progresso e seu plano de conteúdo para a semana."
      >
        <Button size="lg" className="font-manrope rounded-full text-base">
          <Plus className="mr-2 h-5 w-5" />
          Criar Novo
        </Button>
      </PageHeader>

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoadingMetrica
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
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
                <Card
                  key={metric.id}
                  className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">
                      {metric.nome}
                    </CardTitle>
                    {metric.tipoAlteracao === 'aumento' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-headline">
                      {metric.valor}
                    </div>
                    <p
                      className={cn(
                        'text-xs',
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

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Ideias da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingIdeias ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-4/5" />
                    </div>
                  ))}
                </div>
              ) : ideiasSalvas && ideiasSalvas.length > 0 ? (
                <ul className="space-y-3">
                  {ideiasSalvas.map((ideia) => (
                    <li key={ideia.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`ideia-${ideia.id}`}
                        checked={ideia.concluido}
                        onCheckedChange={() => handleToggleIdeia(ideia)}
                        className="h-5 w-5 mt-0.5"
                      />
                      <div className="grid gap-0.5">
                        <label
                          htmlFor={`ideia-${ideia.id}`}
                          className={cn(
                            'font-medium transition-colors',
                            ideia.concluido
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {ideia.titulo}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Salvo de "{ideia.origem}"{' '}
                          {ideia.createdAt &&
                            formatDistanceToNow(ideia.createdAt.toDate(), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed">
                  <Rocket className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground">
                    Comece a Gerar Ideias!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Suas ideias salvas aparecerão aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Roteiro de Conteúdo Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRoteiro ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-6 w-6 rounded-full mt-0.5" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-4">
                  {roteiro?.map((item, index) => (
                    <li key={item.id}>
                      <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50">
                        {item.concluido ? (
                          <CheckCircle className="h-6 w-6 mt-0.5 text-primary" />
                        ) : (
                          <div className="h-6 w-6 mt-0.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-base">
                            <span className="font-semibold text-primary">
                              {item.dia}:
                            </span>{' '}
                            {item.tarefa}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.detalhes}
                          </p>
                        </div>
                      </div>
                      {roteiro && index < roteiro.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Desempenho Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoadingDadosGrafico ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="h-[300px] w-full"
              >
                <BarChart accessibilityLayer data={dadosGrafico}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border) / 0.5)"
                  />
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
                    radius={8}
                    className="fill-primary"
                  />
                  <Bar
                    dataKey="engajamento"
                    fill="var(--color-engajamento)"
                    radius={8}
                    className="fill-pink-400"
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
