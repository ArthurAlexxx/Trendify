
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
  MoreHorizontal,
  CheckCircle,
  Users,
  Eye,
  Heart,
  MessageSquare,
  Instagram,
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
import type {
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
import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, updateDoc, where } from 'firebase/firestore';


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

const ProfileCompletionAlert = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const isProfileComplete = userProfile?.niche && userProfile.followers;
    if (isProfileComplete) return null;

    return (
        <Alert>
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle>Complete seu Perfil!</AlertTitle>
            <AlertDescription>
                {userProfile?.instagramHandle 
                 ? <Link href="/profile" className='hover:underline font-semibold'>Adicione seu nicho no perfil</Link>
                 : <Link href="/settings" className='hover:underline font-semibold'>Conecte seu Instagram</Link>
                } para que a IA gere insights mais precisos.
            </AlertDescription>
        </Alert>
    )
}


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  // --- BUSCA DE DADOS DINÂMICOS ---

  const userProfileRef = useMemoFirebase(() => (
      firestore && user ? doc(firestore, `users/${user.uid}`) : null
  ), [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const roteiroQuery = useMemoFirebase(() => (
      firestore ? query(collection(firestore, 'roteiro'), orderBy('createdAt', 'desc'), limit(1)) : null
  ), [firestore]);
  const { data: roteiroData, isLoading: isLoadingRoteiro } = useCollection<PlanoSemanal>(roteiroQuery);
  const roteiro = roteiroData?.[0];

  const ideiasQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/ideiasSalvas`), where('concluido', '==', false), limit(5)) : null
  ), [firestore, user]);
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } = useCollection<IdeiaSalva>(ideiasQuery);
  
  const upcomingContentQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/conteudoAgendado`), where('status', '==', 'Agendado'), orderBy('date', 'asc'), limit(2)) : null
  ), [firestore, user]);
  const { data: upcomingContent, isLoading: isLoadingUpcoming } = useCollection<ConteudoAgendado>(upcomingContentQuery);

  const isLoading = isLoadingProfile || isLoadingRoteiro || isLoadingIdeias || isLoadingUpcoming;


  const userMetrics = useMemo(() => {
      return [
          { icon: Users, label: "Seguidores", value: userProfile?.followers, description: "Total de seguidores" },
          { icon: Eye, label: "Média de Views", value: userProfile?.averageViews, description: "Por post/vídeo" },
          { icon: Heart, label: "Média de Likes", value: userProfile?.averageLikes, description: "Por post/vídeo" },
          { icon: MessageSquare, label: "Média de Comentários", value: userProfile?.averageComments, description: "Por post/vídeo" },
      ];
  }, [userProfile]);

  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    if (!firestore || !user) return;
    const ideaRef = doc(firestore, `users/${user.uid}/ideiasSalvas`, ideia.id);
    try {
        await updateDoc(ideaRef, { 
            concluido: !ideia.concluido,
            completedAt: !ideia.concluido ? new Date() : null,
        });
        toast({ title: "Tarefa atualizada!"});
    } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: 'destructive'})
    }
  };

  const handleToggleRoteiro = async (toggledItem: ItemRoteiro, index: number) => {
    if (!firestore || !roteiro) return;
    const roteiroRef = doc(firestore, 'roteiro', roteiro.id);
    const updatedItems = roteiro.items.map((item, i) => 
        i === index ? { ...item, concluido: !item.concluido } : item
    );
    try {
        await updateDoc(roteiroRef, { items: updatedItems });
    } catch (e: any) {
        toast({ title: "Erro ao atualizar roteiro", description: e.message, variant: 'destructive'});
    }
  };
  
  const handleMarkAsPublished = async (postId: string) => {
    if (!firestore || !user) return;
    const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, postId);
    try {
        await updateDoc(postRef, { status: 'Publicado' });
        toast({ title: "Post marcado como publicado!"});
    } catch(e: any) {
        toast({ title: "Erro", description: e.message, variant: 'destructive'})
    }
  };


  const visibleItems = roteiro?.items.slice(0, 3);
  const collapsibleItems = roteiro?.items.slice(3);

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<LayoutGrid className="text-primary" />}
        title={`Bem-vindo(a) de volta, ${
          userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Criador'
        }!`}
        description="Seu centro de comando para crescimento e monetização."
      />

      <div className="space-y-8">
        <ProfileCompletionAlert userProfile={userProfile} />

        {/* Métricas Principais */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
                className="rounded-2xl shadow-lg shadow-pink-500/5 border-pink-500/20 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-center sm:text-left"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium text-pink-600">
                    Seguidores no Instagram
                  </CardTitle>
                  <Instagram className="h-5 w-5 text-pink-500" />
                </CardHeader>
                <CardContent>
                  {isLoadingProfile ? <Skeleton className="h-8 w-24 mx-auto sm:mx-0" /> :
                    <>
                        <div className="text-3xl font-bold font-headline text-pink-600">
                            {userProfile?.followers || '—'}
                        </div>
                        <p className="text-xs text-pink-500/80">
                            {userProfile?.instagramHandle || <Link href="/settings" className="hover:underline">Conecte sua conta</Link>}
                        </p>
                    </>
                  }
                </CardContent>
            </Card>

            <Card
                className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card text-center sm:text-left"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    Média de Views
                  </CardTitle>
                  <Eye className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {isLoadingProfile ? <Skeleton className="h-8 w-24 mx-auto sm:mx-0" /> :
                    <>
                        <div className="text-3xl font-bold font-headline">
                            {userProfile?.averageViews || '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {userProfile?.averageViews ? "Por post/vídeo" : <Link href="/settings" className="hover:underline">Conectar conta</Link>}
                        </p>
                    </>
                  }
                </CardContent>
            </Card>
            
            <Card
                className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card text-center sm:text-left"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    Média de Likes
                  </CardTitle>
                  <Heart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {isLoadingProfile ? <Skeleton className="h-8 w-24 mx-auto sm:mx-0" /> :
                    <>
                        <div className="text-3xl font-bold font-headline">
                            {userProfile?.averageLikes || '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                             {userProfile?.averageLikes ? "Por post/vídeo" : <Link href="/settings" className="hover:underline">Conectar conta</Link>}
                        </p>
                    </>
                  }
                </CardContent>
            </Card>

            <Card
                className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card text-center sm:text-left"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    Média de Comentários
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {isLoadingProfile ? <Skeleton className="h-8 w-24 mx-auto sm:mx-0" /> :
                    <>
                        <div className="text-3xl font-bold font-headline">
                            {userProfile?.averageComments || '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {userProfile?.averageComments ? "Por post/vídeo" : <Link href="/settings" className="hover:underline">Conectar conta</Link>}
                        </p>
                    </>
                  }
                </CardContent>
            </Card>
            
        </div>

        {/* Layout Principal do Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Principal (Gráfico e Roteiro) */}
          <div className="lg:col-span-2 space-y-8 flex flex-col">
             <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card flex flex-col">
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="font-headline text-xl">
                  Desempenho Semanal (Simulado)
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2 flex-grow flex flex-col">
                {isLoadingRoteiro ? <Skeleton className="h-[300px] w-full" /> : (
                    roteiro && roteiro.desempenhoSimulado.length > 0 ? (
                    <ChartContainer
                        config={chartConfig}
                        className="h-[300px] w-full"
                    >
                        <BarChart accessibilityLayer data={roteiro.desempenhoSimulado}>
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
                    <div className="h-full w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
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
                    )
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
                {isLoadingRoteiro ? <Skeleton className="h-40 w-full" /> : (
                    roteiro && roteiro.items.length > 0 ? (
                    <div>
                        <ul className="space-y-2">
                            {visibleItems?.map((item, index) => (
                            <li key={index}>
                                <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50 text-left">
                                <Checkbox
                                    id={`roteiro-${index}`}
                                    checked={item.concluido}
                                    onCheckedChange={() => handleToggleRoteiro(item, index)}
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
                                {visibleItems && index < visibleItems.length - 1 && (
                                <Separator className="my-2" />
                                )}
                            </li>
                            ))}
                            <AnimatePresence>
                            {isExpanded && collapsibleItems?.map((item, index) => (
                                <motion.li 
                                key={`collapsible-${index}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                                >
                                    <Separator className="my-2" />
                                    <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50 text-left">
                                    <Checkbox
                                        id={`roteiro-collapsible-${index}`}
                                        checked={item.concluido}
                                        onCheckedChange={() => handleToggleRoteiro(item, 3 + index)}
                                        className="h-5 w-5 mt-1"
                                    />
                                    <div>
                                        <label
                                        htmlFor={`roteiro-collapsible-${index}`}
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
                                </motion.li>
                            ))}
                            </AnimatePresence>
                        </ul>
                        {collapsibleItems && collapsibleItems.length > 0 && !isExpanded && (
                        <div className='flex justify-center mt-2'>
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsExpanded(true)} 
                                className="text-primary hover:text-primary"
                            >
                                Ver restante da semana
                            </Button>
                        </div>
                        )}
                        {isExpanded && (
                        <div className='flex justify-center mt-2'>
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsExpanded(false)} 
                                className="text-primary hover:text-primary"
                            >
                                Ver menos
                            </Button>
                        </div>
                        )}
                    </div>
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
                    )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral (Informações Rápidas) */}
          <div className="lg:col-span-1 space-y-8 flex flex-col">
            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card h-full">
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="font-headline text-xl">
                  Ideias e Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIdeias ? <Skeleton className="h-24 w-full" /> : (
                    ideiasSalvas && ideiasSalvas.length > 0 ? (
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
                    <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed h-full flex flex-col justify-center">
                        <Rocket className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                        <h3 className="font-semibold text-foreground">
                        Comece a Gerar Ideias!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                        Suas ideias e tarefas salvas aparecerão aqui.
                        </p>
                    </div>
                    )
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card flex flex-col h-full">
              <CardHeader className="text-center sm:text-left">
                <CardTitle className="font-headline text-xl">
                  Próximos Posts Agendados
                </CardTitle>
              </CardHeader>
              <CardContent className='flex-grow flex flex-col'>
                {isLoadingUpcoming ? <Skeleton className="h-28 w-full" /> : (
                    upcomingContent && upcomingContent.length > 0 ? (
                    <div className="space-y-4 flex-grow flex flex-col">
                        {upcomingContent.map((post) => (
                        <div
                            key={post.id}
                            className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4 text-left"
                        >
                            <div className="flex items-start gap-3 flex-1 overflow-hidden">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Tag className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold text-foreground text-sm leading-tight truncate">
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
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMarkAsPublished(post.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Marcar como Publicado</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        ))}
                        <div className='mt-auto pt-4'>
                        <Button variant="link" asChild className="w-full">
                            <Link href="/content-calendar">
                            Ver calendário completo
                            </Link>
                        </Button>
                        </div>
                    </div>
                    ) : (
                    <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed flex-grow flex flex-col items-center justify-center">
                        <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                        <h3 className="font-semibold text-foreground">
                        Nenhum post futuro.
                        </h3>
                        <p className="text-sm text-muted-foreground">
                        Agende seu próximo conteúdo no calendário.
                        </p>
                    </div>
                    )
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}

    

    