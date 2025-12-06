
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  Eye,
  Heart,
  MessageSquare,
  AlertTriangle,
  LayoutGrid,
  ClipboardList,
  CalendarPlus,
  MoreHorizontal,
  CheckCircle,
  Tag,
  Rocket,
  RefreshCw,
  Loader2,
  Instagram,
  Film,
  Crown,
  PlayCircle,
  Check,
  Target,
  Pencil,
  Activity,
  Lightbulb,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import type {
  IdeiaSalva,
  ConteudoAgendado,
  UserProfile,
  MetricSnapshot,
  InstagramPostData,
  TikTokProfileData,
  TikTokPostData,
  PlanoSemanal,
  ItemRoteiro,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow, isToday, isSameDay } from 'date-fns';
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
import { useState, useMemo, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, updateDoc, where, getDocs, Timestamp, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getTikTokPosts, getInstagramPosts } from '@/app/(app)/profile/actions';
import { useSubscription } from '@/hooks/useSubscription';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsightsOutput } from './actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const chartConfigBase = {
  followers: { label: "Seguidores" },
  views: { label: "Views" },
  likes: { label: "Likes" },
  comments: { label: "Comentários" },
} satisfies ChartConfig;

const platformChartConfig = {
  total: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
  instagram: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
  tiktok: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
} satisfies Record<string, ChartConfig>;


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');

  const [instaPosts, setInstaPosts] = useState<InstagramPostData[] | null>(null);
  const [tiktokPosts, setTiktokPosts] = useState<TikTokPostData[] | null>(null);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [currentTikTokUrl, setCurrentTikTokUrl] = useState('');

  const [insights, setInsights] = useState<DashboardInsightsOutput | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

  const userProfileRef = useMemoFirebase(() => (
      firestore && user ? doc(firestore, `users/${user.uid}`) : null
  ), [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const weeklyPlansQuery = useMemoFirebase(() => (
    firestore && user ? query(collection(firestore, `users/${user.uid}/weeklyPlans`), orderBy('createdAt', 'desc'), limit(1)) : null
  ), [firestore, user]);
  const { data: weeklyPlansData, isLoading: isLoadingWeeklyPlans } = useCollection<PlanoSemanal>(weeklyPlansQuery);
  const currentPlan = weeklyPlansData?.[0];

  const ideiasQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/ideiasSalvas`), where('concluido', '==', false), limit(5)) : null
  ), [firestore, user]);
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } = useCollection<IdeiaSalva>(ideiasQuery);

  const upcomingContentQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/conteudoAgendado`), where('status', '==', 'Agendado'), orderBy('date', 'asc'), limit(3)) : null
  ), [firestore, user]);
  const { data: upcomingContent, isLoading: isLoadingUpcoming } = useCollection<ConteudoAgendado>(upcomingContentQuery);

  const metricSnapshotsQuery = useMemoFirebase(() => (
    firestore && user ? query(collection(firestore, `users/${user.uid}/metricSnapshots`), orderBy('date', 'desc'), limit(60)) : null
  ), [firestore, user]);
  const { data: metricSnapshots, isLoading: isLoadingMetrics } = useCollection<MetricSnapshot>(metricSnapshotsQuery);

  const isLoading = isLoadingProfile || isLoadingUpcoming || isLoadingMetrics || isSubscriptionLoading || isLoadingIdeias || isLoadingWeeklyPlans;
  
  const handleTikTokClick = (post: TikTokPostData) => {
    if (post.shareUrl) {
        setCurrentTikTokUrl(post.shareUrl);
        setShowTikTokModal(true);
    }
  };
  
  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    if (!firestore || !user) return;
    const ideaRef = doc(firestore, `users/${user.uid}/ideiasSalvas`, ideia.id);
    try {
        await updateDoc(ideaRef, { 
            concluido: !ideia.concluido,
            completedAt: !ideia.concluido ? serverTimestamp() : null,
        });
        toast({ title: "Tarefa atualizada!"});
    } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: 'destructive'})
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

  const diaDaSemana = format(new Date(), 'EEEE', { locale: ptBR });
  const diaDaSemanaNormalizado = diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1);

  const todaysPlanItem = useMemo(() => {
    if (!currentPlan) return null;
    return currentPlan.items.find(item => item.dia.toLowerCase() === diaDaSemana.toLowerCase().split('-')[0]) || null;
  }, [currentPlan, diaDaSemana]);


  const parseMetric = (value?: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
    return isNaN(num) ? 0 : num;
  };

  const formatMetricValue = (value?: string | number): string => {
    if (value === undefined || value === null) return '—';
    const num = typeof value === 'string' ? parseMetric(value) : value;
     if (num === 0) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1000) return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).replace(/,0$/, '') + 'K';
    return String(num);
  };
  
    const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
        if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
        if (num >= 1000) return num.toLocaleString('pt-BR');
        return String(num);
    };

  const { currentFollowers, goalFollowers } = useMemo(() => {
    if (!userProfile) return { currentFollowers: 0, goalFollowers: 0 };
    switch (selectedPlatform) {
      case 'instagram':
        return { currentFollowers: parseMetric(userProfile.instagramFollowers), goalFollowers: userProfile.instagramFollowerGoal || 0 };
      case 'tiktok':
        return { currentFollowers: parseMetric(userProfile.tiktokFollowers), goalFollowers: userProfile.tiktokFollowerGoal || 0 };
      case 'total':
      default:
        return { currentFollowers: parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers), goalFollowers: userProfile.totalFollowerGoal || 0 };
    }
  }, [userProfile, selectedPlatform]);
  
  const followerGoalProgress = goalFollowers > 0 ? Math.min((currentFollowers / goalFollowers) * 100, 100) : 0;
  const pieData = [{ value: followerGoalProgress, fill: 'hsl(var(--primary))' }, { value: 100 - followerGoalProgress, fill: 'hsl(var(--muted))' }];
  
  const latestMetrics = useMemo(() => {
    if (!userProfile) return null;
    if (selectedPlatform === 'total') {
        return {
            followers: parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers),
            views: parseMetric(userProfile.instagramAverageViews) + parseMetric(userProfile.tiktokAverageViews),
            likes: parseMetric(userProfile.instagramAverageLikes) + parseMetric(userProfile.tiktokAverageComments),
            comments: parseMetric(userProfile.instagramAverageComments) + parseMetric(userProfile.tiktokAverageComments),
        }
    }
    return selectedPlatform === 'instagram' ? {
        followers: parseMetric(userProfile.instagramFollowers),
        views: parseMetric(userProfile.instagramAverageViews),
        likes: parseMetric(userProfile.instagramAverageLikes),
        comments: parseMetric(userProfile.instagramAverageComments),
    } : {
        followers: parseMetric(userProfile.tiktokFollowers),
        views: parseMetric(userProfile.tiktokAverageViews),
        likes: parseMetric(userProfile.tiktokAverageLikes),
        comments: parseMetric(userProfile.tiktokAverageComments),
    }
  }, [userProfile, selectedPlatform]);

  const historicalChartData = useMemo(() => {
    if (!metricSnapshots || metricSnapshots.length === 0) return [];
  
    if (selectedPlatform === 'total') {
      const groupedByDay = metricSnapshots.reduce((acc, snap) => {
        const dayStr = format(snap.date.toDate(), 'yyyy-MM-dd'); // Group by a unique date string
        if (!acc[dayStr]) {
          acc[dayStr] = { date: dayStr, followers: 0, views: 0, likes: 0, comments: 0 };
        }
        acc[dayStr].followers += parseMetric(snap.followers);
        acc[dayStr].views += parseMetric(snap.views);
        acc[dayStr].likes += parseMetric(snap.likes);
        acc[dayStr].comments += parseMetric(snap.comments);
        return acc;
      }, {} as Record<string, { date: string; followers: number; views: number; likes: number; comments: number }>);
  
      return Object.values(groupedByDay)
        .sort((a, b) => a.date.localeCompare(b.date)) // Sort by yyyy-MM-dd string
        .slice(-30) // Get the last 30 days
        .map(dayData => ({
          ...dayData,
          date: format(new Date(dayData.date), 'dd/MM'), // Format for display after processing
        }));
    }
  
    // Logic for 'instagram' or 'tiktok'
    return metricSnapshots
      .filter(snap => snap.platform === selectedPlatform)
      .sort((a, b) => a.date.toMillis() - b.date.toMillis()) // Sort ascending
      .slice(-30) // Get the last 30 days
      .map(snap => ({
        date: format(snap.date.toDate(), 'dd/MM'),
        followers: parseMetric(snap.followers),
        views: parseMetric(snap.views),
        likes: parseMetric(snap.likes),
        comments: parseMetric(snap.comments),
      }));
  }, [metricSnapshots, selectedPlatform]);

  useEffect(() => {
    const fetchPosts = async () => {
        if (!userProfile) return;
        setIsFetchingPosts(true);

        if (userProfile.instagramHandle) {
            getInstagramPosts(userProfile.instagramHandle.replace('@', '')).catch(e => console.error("Failed to fetch instagram posts", e));
        }
        if (userProfile.tiktokHandle) {
            getTikTokPosts(userProfile.tiktokHandle.replace('@', '')).then(setTiktokPosts)
                .catch(e => console.error("Failed to fetch tiktok posts", e));
        }
        setIsFetchingPosts(false);
    };
    if (userProfile) fetchPosts();
  }, [userProfile]);

  const handleGenerateInsights = async () => {
     if (!metricSnapshots || metricSnapshots.length < 1) {
        toast({
            title: "Dados Insuficientes",
            description: "Sincronize ou insira suas métricas por pelo menos um dia para gerar uma análise.",
            variant: "destructive"
        });
        return;
    }
     if (!userProfile) return;
     setIsGeneratingInsights(true);
     setInsights(null);
     try {
         const result = await generateDashboardInsights({
             niche: userProfile.niche || 'Não definido',
             objective: `Atingir ${formatMetricValue(goalFollowers)} seguidores.`,
             metricSnapshots: metricSnapshots.map(s => ({
                 date: s.date.toDate().toISOString(),
                 platform: s.platform,
                 followers: parseMetric(s.followers),
                 views: parseMetric(s.views),
                 likes: parseMetric(s.likes),
                 comments: parseMetric(s.comments),
             })).slice(0, 14),
         });
         setInsights(result);
     } catch (e: any) {
         console.error("Error generating insights:", e.message);
         toast({ title: "Erro ao Gerar Análise", description: e.message, variant: "destructive" });
     } finally {
         setIsGeneratingInsights(false);
     }
  }

  const getMetricRating = (value: number, type: 'views' | 'likes' | 'comments', followers: number): { iconName: 'Smile' | 'Meh' | 'Frown', color: string } => {
    if (followers === 0) {
        return { iconName: 'Meh', color: 'text-yellow-500' };
    }

    const ratio = value / followers;
    
    const thresholds = {
        views: { good: 0.25, medium: 0.05 },    // 25% = bom, 5% = médio
        likes: { good: 0.03, medium: 0.01 },    // 3% = bom, 1% = médio
        comments: { good: 0.005, medium: 0.001 } // 0.5% = bom, 0.1% = médio
    };

    if (ratio >= thresholds[type].good) {
      return { iconName: 'Smile', color: 'text-green-500' };
    }
    if (ratio >= thresholds[type].medium) {
      return { iconName: 'Meh', color: 'text-yellow-500' };
    }
    return { iconName: 'Frown', color: 'text-red-500' };
  };
  
  const GoalCard = () => (
    <Card className="rounded-2xl border-0 h-full">
        <CardHeader>
          <CardTitle className="text-center">Meta de Seguidores</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center">
                {isLoading ? <Skeleton className="h-48 w-48 rounded-full" /> : 
                goalFollowers > 0 ? (
                <div className='relative h-48 w-48'>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={pieData} dataKey="value" startAngle={90} endAngle={-270} innerRadius="80%" outerRadius="100%" cornerRadius={50} paddingAngle={0} stroke="none">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie></PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold font-headline text-primary">{followerGoalProgress.toFixed(0)}%</span></div>
                </div>
                ) : (
                    <div className='flex flex-col items-center justify-center h-48 w-48 rounded-full border-4 border-dashed bg-muted'><Target className="h-12 w-12 text-muted-foreground" /></div>
                )}
                  <p className="text-3xl font-bold font-headline mt-4">{formatMetricValue(currentFollowers)}</p>
                {goalFollowers > 0 ? (
                    <p className="text-sm text-muted-foreground">de {formatMetricValue(goalFollowers)} seguidores</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Defina uma meta para começar</p>
                )}
            </div>
        </CardContent>
    </Card>
  );

  const ActionHubCard = () => (
     <Card className="rounded-2xl border-0 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-center font-headline text-xl">
          Hub de Ação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
            <Tabs defaultValue="proximos" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="proximos">Próximos</TabsTrigger>
                    <TabsTrigger value="ideias">Ideias</TabsTrigger>
                    <TabsTrigger value="hoje">Plano de Hoje</TabsTrigger>
                </TabsList>
                <TabsContent value="proximos" className="mt-4 flex-grow">
                    {isLoadingUpcoming ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : upcomingContent && upcomingContent.length > 0 ? (<div className="space-y-2">{upcomingContent.map(post => (<div key={post.id} className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"><div className="flex items-start gap-4 flex-1 overflow-hidden"><div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Tag className="h-5 w-5 text-muted-foreground" /></div><div className="flex-1 overflow-hidden"><p className="font-semibold text-foreground truncate text-sm">{post.title}</p><p className="text-xs text-muted-foreground">{post.contentType} • {formatDistanceToNow(post.date.toDate(), { addSuffix: true, locale: ptBR })}</p></div></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleMarkAsPublished(post.id)}><CheckCircle className="mr-2 h-4 w-4" /><span>Marcar como Publicado</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>))}</div>) : (<div className="text-center py-8"><p className="text-muted-foreground text-sm">Nenhum post agendado.</p><Button variant="link" asChild><Link href="/content-calendar">Ir para o Calendário</Link></Button></div>)}
                </TabsContent>
                <TabsContent value="ideias" className="mt-4 flex-grow">
                    {isLoadingIdeias ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : ideiasSalvas && ideiasSalvas.length > 0 ? <ul className="space-y-3">{ideiasSalvas.map((ideia) => (<li key={ideia.id} className="flex items-start gap-3"><Checkbox id={`ideia-${ideia.id}`} checked={ideia.concluido} onCheckedChange={() => handleToggleIdeia(ideia)} className="h-5 w-5 mt-0.5" /><div className="grid gap-0.5"><label htmlFor={`ideia-${ideia.id}`} className={cn('font-medium transition-colors cursor-pointer', ideia.concluido ? 'line-through text-muted-foreground' : 'text-foreground')}>{ideia.titulo}</label><p className="text-xs text-muted-foreground">de "{ideia.origem}"</p></div></li>))}</ul> : (<div className="text-center py-8"><p className="text-muted-foreground text-sm">Nenhuma ideia salva.</p><Button variant="link" asChild><Link href="/video-ideas">Gerar Novas Ideias</Link></Button></div>)}
                </TabsContent>
                 <TabsContent value="hoje" className="mt-4 flex-grow">
                    {isLoadingWeeklyPlans ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
                    todaysPlanItem ? (
                        <div className="p-3 rounded-lg border bg-background/50 space-y-2">
                           <p className="font-semibold text-foreground">{todaysPlanItem.tarefa}</p>
                           <p className="text-xs text-muted-foreground">{todaysPlanItem.detalhes}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8"><p className="text-muted-foreground text-sm">Nenhuma tarefa no plano para hoje.</p><Button variant="link" asChild><Link href="/generate-weekly-plan">Gerar Novo Plano</Link></Button></div>
                    )}
                </TabsContent>
            </Tabs>
      </CardContent>
    </Card>
  );

  const EngagementMetricsCard = () => (
      <Card className='rounded-2xl border-0'>
        <CardHeader>
            <CardTitle className="text-center">Métricas de Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Eye className="h-4 w-4" /> Views</h3>
                      <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.views)}</p>
                    </div>
                    <div>
                        {latestMetrics?.views !== undefined && latestMetrics.followers > 0 && (() => {
                              const rating = getMetricRating(latestMetrics.views, 'views', latestMetrics.followers);
                              return (
                                <div className={cn('h-7 w-7', rating.color)}>
                                  {rating.iconName === 'Smile' && <Smile className="h-full w-full" />}
                                  {rating.iconName === 'Meh' && <Meh className="h-full w-full" />}
                                  {rating.iconName === 'Frown' && <Frown className="h-full w-full" />}
                                </div>
                              )
                          })()}
                    </div>
                </div>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Heart className="h-4 w-4" /> Likes</h3>
                      <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.likes)}</p>
                    </div>
                      <div>
                        {latestMetrics?.likes !== undefined && latestMetrics.followers > 0 && (() => {
                          const rating = getMetricRating(latestMetrics.likes, 'likes', latestMetrics.followers);
                          return (
                            <div className={cn('h-7 w-7', rating.color)}>
                              {rating.iconName === 'Smile' && <Smile className="h-full w-full" />}
                              {rating.iconName === 'Meh' && <Meh className="h-full w-full" />}
                              {rating.iconName === 'Frown' && <Frown className="h-full w-full" />}
                            </div>
                          )
                        })()}
                    </div>
                </div>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><MessageSquare className="h-4 w-4" /> Comentários</h3>
                      <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.comments)}</p>
                    </div>
                      <div>
                        {latestMetrics?.comments !== undefined && latestMetrics.followers > 0 && (() => {
                          const rating = getMetricRating(latestMetrics.comments, 'comments', latestMetrics.followers);
                          return (
                            <div className={cn('h-7 w-7', rating.color)}>
                              {rating.iconName === 'Smile' && <Smile className="h-full w-full" />}
                              {rating.iconName === 'Meh' && <Meh className="h-full w-full" />}
                              {rating.iconName === 'Frown' && <Frown className="h-full w-full" />}
                            </div>
                          )
                        })()}
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
  );

  const PerformanceAnalysisCard = () => (
    <Card className="rounded-2xl border-0 h-full flex flex-col">
       <CardHeader>
           <CardTitle className="text-center">Análise de Desempenho</CardTitle>
       </CardHeader>
      <CardContent className="flex-1 flex flex-col">
          {isGeneratingInsights ? (
              <div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : insights && insights.insights ? (
              <ScrollArea className="h-64 pr-4">
              <ul className="space-y-4">
                  {insights.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5"><Lightbulb className="h-3.5 w-3.5" /></div>
                      <p className="text-sm text-muted-foreground">{insight}</p>
                  </li>
                  ))}
              </ul>
              </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 gap-4">
              <p className="text-sm text-muted-foreground">Clique em 'Analisar' para receber uma análise com base nas suas últimas métricas.</p>
              <Button variant="ghost" size="sm" onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                  {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Analisar
              </Button>
          </div>
          )}
      </CardContent>
    </Card>
  );
  
  const EvolutionChartCard = () => (
    <Card className="rounded-2xl border-0">
        <CardHeader><CardTitle className="text-center">Evolução das Métricas</CardTitle></CardHeader>
        <CardContent className="pl-2 pr-6">
            {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
            historicalChartData.length > 0 ? (
                <ChartContainer config={platformChartConfig[selectedPlatform]} className="h-[350px] w-full">
                <BarChart accessibilityLayer data={historicalChartData} margin={{ left: 0, right: 12, top: 5, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                    <RechartsTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="followers" fill="var(--color-followers)" radius={4} name="Seguidores" />
                    <Bar dataKey="views" fill="var(--color-views)" radius={4} name="Views"/>
                    <Bar dataKey="likes" fill="var(--color-likes)" radius={4} name="Likes"/>
                    <Bar dataKey="comments" fill="var(--color-comments)" radius={4} name="Comentários"/>
                </BarChart>
                </ChartContainer>
            ) : (
                <div className="h-[350px] w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                    <div>
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-foreground">{(userProfile?.instagramHandle || userProfile?.tiktokHandle) ? "Dados insuficientes." : "Nenhuma plataforma conectada."}</h3>
                    <p className="text-sm text-muted-foreground"> {userProfile && <Link href="/profile/integrations" className="text-primary font-medium hover:underline cursor-pointer">Sincronize suas métricas</Link>} para começar a ver seus dados.</p>
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={showTikTokModal} onOpenChange={setShowTikTokModal}>
          <DialogContent className="sm:max-w-md p-0 border-0">
              {currentTikTokUrl && (
                  <iframe
                      key={currentTikTokUrl}
                      src={`https://www.tiktok.com/embed/v2/${currentTikTokUrl.split('/').pop()}`}
                      className="w-full aspect-video"
                      allow="autoplay; encrypted-media;"
                  ></iframe>
              )}
          </DialogContent>
      </Dialog>

      <div className="space-y-8">
        <PageHeader
          icon={LayoutGrid}
          title={`Bem-vindo(a), ${userProfile?.displayName?.split(' ')[0] || 'Criador'}!`}
          description="Seu centro de comando para crescimento e monetização."
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
                <TabsList>
                  <TabsTrigger value="total">Total</TabsTrigger>
                  <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                </TabsList>
              </Tabs>
              {userProfile && 
              <FollowerGoalSheet userProfile={userProfile}>
                  <Button variant="outline" size="sm" className="w-full"><Pencil className="mr-2 h-4 w-4" /> Editar Metas</Button>
              </FollowerGoalSheet>
              }
          </div>
        </PageHeader>

        <div className="space-y-8">
          
          {userProfile && <ProfileCompletionAlert userProfile={userProfile} isPremium={isPremium} />}

          {/* Mobile Carousel */}
            <div className="lg:hidden space-y-8">
                <Carousel>
                    <CarouselContent>
                        <CarouselItem><GoalCard /></CarouselItem>
                        <CarouselItem><EngagementMetricsCard /></CarouselItem>
                         <CarouselItem><PerformanceAnalysisCard /></CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
                <EvolutionChartCard />
                <ActionHubCard />
            </div>

          {/* Main Grid */}
          <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-8">
                <GoalCard />
                <ActionHubCard />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-8">
              <EngagementMetricsCard />
              <EvolutionChartCard />
              <PerformanceAnalysisCard />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

    

    
