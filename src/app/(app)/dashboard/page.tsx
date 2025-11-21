
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Rocket,
  Lightbulb,
  Video,
  Newspaper,
  Calendar,
  ChevronDown,
  Tag,
  ClipboardList,
  AlertTriangle,
  LayoutGrid,
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
  useDoc,
} from '@/firebase';
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  Metrica,
  ItemRoteiro,
  IdeiaSalva,
  ConteudoAgendado,
  UserProfile,
  PlanoSemanal,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

const ProfileCompletionAlert = () => {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  if (isLoading || !userProfile) {
    return null; // Don't show anything while loading or if there's no profile
  }

  const isProfileIncomplete =
    !userProfile.followers ||
    !userProfile.audience ||
    !userProfile.averageViews ||
    !userProfile.bio;

  if (!isProfileIncomplete) {
    return null;
  }

  return (
    <Alert className="mb-8 border-primary/30 bg-primary/5 text-center sm:text-left">
      <AlertTriangle className="h-4 w-4 text-primary" />
      <AlertTitle className='font-semibold text-primary'>Atualize seu Perfil!</AlertTitle>
      <AlertDescription>
        Métricas como seguidores, nicho e engajamento são essenciais para a IA gerar estratégias precisas.
        <Button variant="link" asChild className="p-0 h-auto ml-1 font-semibold">
          <Link href="/settings">Completar seu perfil agora.</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const metricaQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'metrica') : null),
    [firestore]
  );
  const { data: metrica, isLoading: isLoadingMetrica } =
    useCollection<Metrica>(metricaQuery);

  const roteiroQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'roteiro'),
            orderBy('createdAt', 'desc'),
            limit(1)
          )
        : null,
    [firestore]
  );
  const { data: roteiroData, isLoading: isLoadingRoteiro } = useCollection<PlanoSemanal>(roteiroQuery);

  const roteiro = roteiroData?.[0];
  const roteiroItems = roteiro?.items;
  const dadosGrafico = roteiro?.desempenhoSimulado;


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
      const isCompleting = !ideia.concluido;
      await updateDoc(ideiaRef, { 
        concluido: isCompleting,
        completedAt: isCompleting ? serverTimestamp() : null,
       });
    } catch (error) {
      console.error('Failed to update idea status:', error);
    }
  };

  const handleToggleRoteiro = async (item: ItemRoteiro) => {
    if (!firestore || !roteiro) return;
    const planoRef = doc(firestore, 'roteiro', roteiro.id);
    const updatedItems = roteiroItems?.map((i) =>
      i.tarefa === item.tarefa ? { ...i, concluido: !i.concluido } : i
    );
    try {
      await updateDoc(planoRef, { items: updatedItems });
    } catch (error) {
      console.error('Failed to update roteiro status:', error);
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<LayoutGrid />}
        title={`Bem-vindo(a) de volta, ${
          user?.displayName?.split(' ')[0] || 'Criador'
        }!`}
        description="Seu centro de comando para crescimento e monetização."
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="font-manrope rounded-full text-base w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Criar Novo
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/generate-weekly-plan">
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>Planejamento Semanal</span>
              </Link>
            </DropdownMenuItem>
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
      
      <ProfileCompletionAlert />

      <div className="space-y-8">
        {/* Métricas Principais */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoadingMetrica
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl text-center sm:text-left">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-1/3 mb-2 mx-auto sm:mx-0" />
                    <Skeleton className="h-3 w-1/2 mx-auto sm:mx-0" />
                  </CardContent>
                </Card>
              ))
            : metrica?.map((metric) => (
                <Card
                  key={metric.id}
                  className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card text-center sm:text-left"
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

        {/* Layout Principal do Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Coluna Principal (Ações e Tarefas) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
              <CardHeader className="text-center sm:text-left">
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
                      <li key={ideia.id} className="flex items-start gap-3 text-left">
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
              <CardHeader className="text-center sm:text-left">
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
                ) : roteiroItems && roteiroItems.length > 0 ? (
                  <ul className="space-y-2">
                    {roteiroItems.map((item, index) => (
                      <li key={index}>
                        <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50 text-left">
                          <Checkbox
                            id={`roteiro-${index}`}
                            checked={item.concluido}
                            onCheckedChange={() => handleToggleRoteiro(item)}
                            className="h-5 w-5 mt-1"
                          />
                          <div>
                            <label
                              htmlFor={`roteiro-${index}`}
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
                        {roteiroItems && index < roteiroItems.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed">
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-foreground">
                      Sem roteiro para a semana.
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gere um novo no{' '}
                      <Link
                        href="/generate-weekly-plan"
                        className="text-primary font-medium hover:underline"
                      >
                        Planejamento Semanal
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral (Informações Rápidas) */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
              <CardHeader className="text-center sm:text-left">
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
                        className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4 text-left"
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
                              {formatDistanceToNow(post.date.toDate(), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            post.status === 'Agendado' ? 'default' : 'outline'
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                    ))}
                    <Button variant="link" asChild className="w-full">
                      <Link href="/content-calendar">
                        Ver calendário completo
                      </Link>
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

             <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="font-headline text-xl">
                  Desempenho Semanal (Simulado)
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                {isLoadingRoteiro ? (
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full rounded-xl" />
                  </div>
                ) : dadosGrafico && dadosGrafico.length > 0 ? (
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
                      />
                      <Bar
                        dataKey="engajamento"
                        fill="var(--color-engajamento)"
                        radius={8}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] w-full flex items-center justify-center text-center p-4">
                    <div>
                      <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                      <h3 className="font-semibold text-foreground">
                        Sem dados de desempenho.
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Gere um roteiro para ver uma simulação.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
