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
  Lightbulb,
  Video,
  Newspaper,
  Calendar,
  ChevronDown,
  Tag,
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
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  Metrica,
  PontoDadosGrafico,
  ItemRoteiro,
  IdeiaSalva,
  ConteudoAgendado,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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
    () => (firestore ? query(collection(firestore, 'roteiro'), orderBy('dia')) : null),
    [firestore]
  );
  const { data: roteiro, isLoading: isLoadingRoteiro } =
    useCollection<ItemRoteiro>(roteiroQuery);

  const ideiasSalvasQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            where('concluido', '==', false),
            limit(5)
          )
        : null,
    [firestore, user]
  );
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } =
    useCollection<IdeiaSalva>(ideiasSalvasQuery);

  const upcomingContentQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const now = new Date();
    return query(
      collection(firestore, `users/${user.uid}/conteudoAgendado`),
      where('date', '>=', now),
      orderBy('date', 'asc'),
      limit(3)
    );
  }, [firestore, user]);

  const { data: upcomingContent, isLoading: isLoadingUpcomingContent } =
    useCollection<ConteudoAgendado>(upcomingContentQuery);

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
      console.error('Failed to update idea status:', error);
    }
  };

  const handleToggleRoteiro = async (item: ItemRoteiro) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'roteiro', item.id);
    try {
      await updateDoc(itemRef, { concluido: !item.concluido });
    } catch (error) {
      console.error('Failed to update roteiro status:', error);
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title={`Bem-vindo(a) de volta, ${
          user?.displayName?.split(' ')[0] || 'Criador'
        }!`}
        description="Aqui está um resumo do seu progresso e seu plano de conteúdo para a semana."
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="font-manrope rounded-full text-base">
              <Plus className="mr-2 h-5 w-5" />
              Criar Novo
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/video-ideas">
                <Lightbulb className="mr-2 h-4 w-4" />
                <span>Ideia de Vídeo</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/video-review">
                <Video className="mr-2 h-4 w-4" />
                <span>Análise de Vídeo</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/publis-assistant">
                <Newspaper className="mr-2 h-4 w-4" />
                <span>Proposta de Publi</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/content-calendar">
                <Calendar className="mr-2 h-4 w-4" />
                <span>Agendar Post</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8">
            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
              <CardHeader>
                <CardTitle className="font-headline text-xl">
                  Ideias e Tarefas
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
                              'font-medium transition-colors cursor-pointer',
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
                      Suas ideias e tarefas salvas aparecerão aqui.
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
                  <ul className="space-y-2">
                    {roteiro?.map((item, index) => (
                      <li key={item.id}>
                        <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50">
                          <Checkbox
                            id={`roteiro-${item.id}`}
                            checked={item.concluido}
                            onCheckedChange={() => handleToggleRoteiro(item)}
                            className="h-5 w-5 mt-1"
                          />
                          <div>
                            <label
                              htmlFor={`roteiro-${item.id}`}
                              className={cn(
                                'font-medium text-base transition-colors cursor-pointer',
                                item.concluido
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              )}
                            >
                              <span className="font-semibold text-primary">
                                {item.dia}:
                              </span>{' '}
                              {item.tarefa}
                            </label>
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

          <div className="lg:col-span-1">
            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
              <CardHeader>
                <CardTitle className="font-headline text-xl">
                  Próximos Posts Agendados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUpcomingContent ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : upcomingContent && upcomingContent.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingContent.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Tag className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {post.contentType} •{' '}
                              {format(
                                post.date.toDate(),
                                "dd/MM 'às' HH:mm"
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant={post.status === 'Agendado' ? 'default' : 'outline'}>{post.status}</Badge>
                      </div>
                    ))}
                     <Button variant="link" asChild className="w-full">
                       <Link href="/content-calendar">Ver calendário completo</Link>
                     </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed">
                    <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-foreground">
                      Nenhum post futuro.
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Agende seu próximo conteúdo no calendário.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
