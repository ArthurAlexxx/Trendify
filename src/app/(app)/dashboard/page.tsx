
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
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Tooltip as RechartsTooltip } from 'recharts';
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
  views: { label: "Views", color: "hsl(var(--chart-1))" },
  likes: { label: "Likes", color: "hsl(var(--chart-2))" },
  comments: { label: "Comentários", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const ProfileCompletionAlert = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const isProfileComplete = userProfile?.niche && (userProfile.instagramFollowers || userProfile.tiktokFollowers);
    if (isProfileComplete) return null;

    return (
        <Alert>
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle>Complete seu Perfil!</AlertTitle>
            <AlertDescription>
                <Link href="/profile" className='hover:underline font-semibold'>Adicione seu nicho e métricas</Link> para que a IA gere insights mais precisos e os gráficos funcionem.
            </AlertDescription>
        </Alert>
    )
}


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'tiktok'>('instagram');

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

  const platformMetrics = useMemo(() => {
    if (!userProfile) return { followers: '—', handle: 'Adicionar no perfil' };
    if (selectedPlatform === 'instagram') {
        return {
            followers: userProfile.instagramFollowers || '—',
            handle: userProfile.instagramHandle || 'Adicionar no perfil',
        }
    } else {
        return {
            followers: userProfile.tiktokFollowers || '—',
            handle: userProfile.tiktokHandle || 'Adicionar no perfil',
        }
    }
  }, [userProfile, selectedPlatform]);

  const metricsChartData = useMemo(() => {
     if (!userProfile) return [];
     
     const parseMetric = (value?: string) => {
        if (!value) return 0;
        const num = parseFloat(value.replace('K', '000').replace('M', '000000').replace(',', '.'));
        return isNaN(num) ? 0 : num;
     }

     if (selectedPlatform === 'instagram') {
        return [
            { name: 'Métricas', views: parseMetric(userProfile.instagramAverageViews), likes: parseMetric(userProfile.instagramAverageLikes), comments: parseMetric(userProfile.instagramAverageComments) }
        ]
     } else {
         return [
            { name: 'Métricas', views: parseMetric(userProfile.tiktokAverageViews), likes: parseMetric(userProfile.tiktokAverageLikes), comments: parseMetric(userProfile.tiktokAverageComments) }
        ]
     }
  }, [userProfile, selectedPlatform]);


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
  const hasMetricsData = metricsChartData.length > 0 && (metricsChartData[0].views > 0 || metricsChartData[0].likes > 0 || metricsChartData[0].comments > 0);

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
        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
            <CardHeader className="flex-row items-center justify-between pb-2">
                 <CardTitle className="text-base font-medium text-muted-foreground">
                    Visão Geral da Plataforma
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="instagram" checked={selectedPlatform === 'instagram'} onCheckedChange={() => setSelectedPlatform('instagram')} />
                        <label htmlFor="instagram" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Instagram
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="tiktok" checked={selectedPlatform === 'tiktok'} onCheckedChange={() => setSelectedPlatform('tiktok')} />
                        <label htmlFor="tiktok" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          TikTok
                        </label>
                      </div>
                  </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-6 rounded-lg bg-muted/50 flex flex-col justify-center">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <h3 className="text-base font-medium text-muted-foreground">
                            Seguidores
                          </h3>
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                         {isLoadingProfile ? <Skeleton className="h-8 w-24" /> :
                            <>
                                <div className="text-3xl font-bold font-headline">
                                    {platformMetrics.followers}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {platformMetrics.followers === '—' ? <Link href="/profile" className="hover:underline">Adicionar no perfil</Link> : platformMetrics.handle}
                                </p>
                            </>
                        }
                    </div>
                     <div className="lg:col-span-3">
                        {isLoadingProfile ? <Skeleton className="h-[200px] w-full" /> : 
                            hasMetricsData ? (
                                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                                <BarChart data={metricsChartData} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid horizontal={false} />
                                    <YAxis type="category" dataKey="name" hide />
                                    <XAxis type="number" hide />
                                    <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="views" name="Views" fill="var(--color-views)" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="likes" name="Likes" fill="var(--color-likes)" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="comments" name="Comentários" fill="var(--color-comments)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                                    <div>
                                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                                    <h3 className="font-semibold text-foreground">
                                        Sem dados de métricas.
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                       <Link href="/profile" className="text-primary font-medium hover:underline">Adicione as métricas</Link> para ver o gráfico.
                                    </p>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                </div>
            </CardContent>
        </Card>


        {/* Layout Principal do Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Principal (Gráfico e Roteiro) */}
          <div className="lg:col-span-2 space-y-8 flex flex-col">
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

    