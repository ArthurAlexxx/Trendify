
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
  ItemRoteiro,
  IdeiaSalva,
  ConteudoAgendado,
  UserProfile,
  PlanoSemanal,
  MetricSnapshot,
  InstagramPostData,
  TikTokProfileData,
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
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, updateDoc, where, getDocs, Timestamp, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getTikTokPosts, getInstagramPosts } from '@/app/(app)/profile/actions';
import { useSubscription } from '@/hooks/useSubscription';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsight } from './actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


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
  const [tiktokPosts, setTiktokPosts] = useState<TikTokProfileData[] | null>(null);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [currentTikTokUrl, setCurrentTikTokUrl] = useState('');

  const [insights, setInsights] = useState<DashboardInsight[] | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

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
      firestore && user ? query(collection(firestore, `users/${user.uid}/conteudoAgendado`), where('status', '==', 'Agendado'), orderBy('date', 'asc'), limit(3)) : null
  ), [firestore, user]);
  const { data: upcomingContent, isLoading: isLoadingUpcoming } = useCollection<ConteudoAgendado>(upcomingContentQuery);

  const metricSnapshotsQuery = useMemoFirebase(() => (
    firestore && user ? query(collection(firestore, `users/${user.uid}/metricSnapshots`), orderBy('date', 'desc'), limit(60)) : null
  ), [firestore, user]);
  const { data: metricSnapshots, isLoading: isLoadingMetrics } = useCollection<MetricSnapshot>(metricSnapshotsQuery);

  const isLoading = isLoadingProfile || isLoadingRoteiro || isLoadingUpcoming || isLoadingMetrics || isSubscriptionLoading || isLoadingIdeias;
  
  const handleTikTokClick = (post: TikTokProfileData) => {
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

  const handleToggleRoteiro = async (toggledItem: ItemRoteiro, index: number) => {
    if (!firestore || !roteiro) return;
    const roteiroRef = doc(firestore, 'roteiro', roteiro.id);
    
    const originalIndex = roteiro.items.findIndex(item => item.tarefa === toggledItem.tarefa && item.dia === toggledItem.dia);
    if (originalIndex === -1) return;

    const updatedItems = roteiro.items.map((item, i) => 
        i === originalIndex ? { ...item, concluido: !item.concluido } : item
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

  const diaDaSemana = format(new Date(), 'EEEE', { locale: ptBR });
  const diaDaSemanaNormalizado = diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1);
  const roteiroDoDia = roteiro?.items.filter(item => item.dia.toLowerCase() === diaDaSemanaNormalizado.toLowerCase().replace('-feira', ''));

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
            views: parseMetric(userProfile.instagramAverageViews) + parseMetric(userProfile.tiktokAverageViews),
            likes: parseMetric(userProfile.instagramAverageLikes) + parseMetric(userProfile.tiktokAverageComments),
        }
    }
    return selectedPlatform === 'instagram' ? {
        views: parseMetric(userProfile.instagramAverageViews),
        likes: parseMetric(userProfile.instagramAverageLikes),
        comments: parseMetric(userProfile.instagramAverageComments),
    } : {
        views: parseMetric(userProfile.tiktokAverageViews),
        likes: parseMetric(userProfile.tiktokAverageLikes),
        comments: parseMetric(userProfile.tiktokAverageComments),
    }
  }, [userProfile, selectedPlatform]);

  const historicalChartData = useMemo(() => {
    if (!metricSnapshots || metricSnapshots.length === 0) return [];
    let platformSnapshots = selectedPlatform !== 'total' ? metricSnapshots.filter(snap => snap.platform === selectedPlatform) : metricSnapshots;
    
    const groupedByDay = platformSnapshots.reduce((acc, snap) => {
        const dayStr = format(snap.date.toDate(), 'yyyy-MM-dd');
        if (!acc[dayStr]) acc[dayStr] = { date: snap.date.toDate(), followers: 0, views: 0, likes: 0, comments: 0 };
        acc[dayStr].followers += parseMetric(snap.followers);
        acc[dayStr].views += parseMetric(snap.views);
        acc[dayStr].likes += parseMetric(snap.likes);
        acc[dayStr].comments += parseMetric(snap.comments);
        return acc;
    }, {} as Record<string, { date: Date; followers: number; views: number; likes: number; comments: number }>);
  
    const sortedDaysData = Object.values(groupedByDay).sort((a, b) => a.date.getTime() - b.date.getTime());
    const chartData = sortedDaysData.slice(-7);

    return chartData.map(dayData => ({
        date: format(dayData.date, 'dd/MM'),
        followers: dayData.followers,
        views: dayData.views,
        likes: dayData.likes,
        comments: dayData.comments,
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

    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
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
        
        <div className="lg:hidden">
            <Carousel className="w-full" opts={{ align: 'start' }}>
            <CarouselContent className="-ml-2 md:-ml-4 py-4">
                <CarouselItem className="pl-2 md:pl-4 basis-full">
                <Card className="rounded-2xl border-0 h-full">
                    <CardHeader className='items-center text-center'>
                        <CardTitle>Meta de Seguidores</CardTitle>
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
                </CarouselItem>
                <CarouselItem className="pl-2 md:pl-4 basis-full">
                <Card className='rounded-2xl border-0 h-full'>
                    <CardHeader>
                        <CardTitle>Métricas de Engajamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-1 gap-4'>
                            <div className='p-4 rounded-lg bg-muted/50 border'>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Eye className="h-4 w-4" /> Views</h3>
                                <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.views)}</p>
                            </div>
                            <div className='p-4 rounded-lg bg-muted/50 border'>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Heart className="h-4 w-4" /> Likes</h3>
                                <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.likes)}</p>
                            </div>
                            <div className='p-4 rounded-lg bg-muted/50 border'>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><MessageSquare className="h-4 w-4" /> Comentários</h3>
                                <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.comments)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </CarouselItem>
                <CarouselItem className="pl-2 md:pl-4 basis-full">
                <Card className="rounded-2xl border-0 h-full flex flex-col">
                    <CardHeader className='flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left'>
                        <CardTitle>Análise de Desempenho</CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleGenerateInsights} disabled={isGeneratingInsights} className="w-full sm:w-auto">
                            {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Analisar Desempenho
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        {isGeneratingInsights ? <div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : insights && insights.length > 0 ? (
                            <ScrollArea className="h-48 pr-4">
                            <ul className="space-y-4">
                                {insights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5"><Lightbulb className="h-3.5 w-3.5" /></div>
                                    <p className="text-sm text-muted-foreground">{insight.insight}</p>
                                </li>
                                ))}
                            </ul>
                            </ScrollArea>
                        ) : (
                            <div className="flex-1 flex flex-col justify-center items-center text-center text-sm text-muted-foreground p-4">
                                <p>Clique em 'Analisar Desempenho' para receber uma análise com base nas suas últimas métricas.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="flex -left-2" />
            <CarouselNext className="flex -right-2" />
            </Carousel>
        </div>

        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
             <Card className="rounded-2xl border-0 h-full">
                <CardHeader className='items-center text-center'>
                    <CardTitle>Meta de Seguidores</CardTitle>
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
             <Card className='rounded-2xl border-0 h-full'>
                <CardHeader>
                    <CardTitle>Métricas de Engajamento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 gap-4'>
                        <div className='p-4 rounded-lg bg-muted/50 border'>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Eye className="h-4 w-4" /> Views</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.views)}</p>
                        </div>
                        <div className='p-4 rounded-lg bg-muted/50 border'>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Heart className="h-4 w-4" /> Likes</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.likes)}</p>
                        </div>
                        <div className='p-4 rounded-lg bg-muted/50 border'>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><MessageSquare className="h-4 w-4" /> Comentários</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatMetricValue(latestMetrics?.comments)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 h-full flex flex-col">
                <CardHeader className='flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left'>
                    <CardTitle>Análise de Desempenho</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleGenerateInsights} disabled={isGeneratingInsights} className="w-full sm:w-auto">
                        {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Analisar Desempenho
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    {isGeneratingInsights ? <div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : insights && insights.length > 0 ? (
                        <ScrollArea className="h-48 pr-4">
                        <ul className="space-y-4">
                            {insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5"><Lightbulb className="h-3.5 w-3.5" /></div>
                                <p className="text-sm text-muted-foreground">{insight.insight}</p>
                            </li>
                            ))}
                        </ul>
                        </ScrollArea>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center text-sm text-muted-foreground p-4">
                            <p>Clique em 'Analisar Desempenho' para receber uma análise com base nas suas últimas métricas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="rounded-2xl border-0 lg:col-span-2">
                <CardHeader><CardTitle>Evolução das Métricas</CardTitle></CardHeader>
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

            <div className="lg:col-span-1 space-y-8">
                 <Card className="rounded-2xl border-0">
                    <CardHeader><CardTitle>Hub de Ação Rápida</CardTitle></CardHeader>
                    <CardContent className="pt-4">
                         <Tabs defaultValue="roteiro" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
                                <TabsTrigger value="proximos">Próximos</TabsTrigger>
                                <TabsTrigger value="ideias">Ideias</TabsTrigger>
                                <TabsTrigger value="atividade">Atividade</TabsTrigger>
                            </TabsList>
                            <TabsContent value="roteiro" className="mt-4">
                                <div className='space-y-2'>
                                    <h4 className='text-center text-sm font-medium text-muted-foreground'>Roteiro do Dia ({diaDaSemanaNormalizado})</h4>
                                    {isLoadingRoteiro ? <Skeleton className="h-24 w-full" /> : roteiroDoDia && roteiroDoDia.length > 0 ? <ul className="space-y-3">{roteiroDoDia.map((item, index) => <li key={index}><div className="flex items-start gap-3"><Checkbox id={`roteiro-dia-${index}`} checked={item.concluido} onCheckedChange={() => handleToggleRoteiro(item, index)} className="h-5 w-5 mt-0.5" /><div><label htmlFor={`roteiro-dia-${index}`} className={cn('font-medium transition-colors cursor-pointer', item.concluido ? 'line-through text-muted-foreground' : 'text-foreground')}>{item.tarefa}</label><p className="text-xs text-muted-foreground">{item.detalhes}</p></div></div></li>)}</ul> : <div className="text-center py-4 rounded-xl bg-muted/50 border border-dashed h-full flex flex-col justify-center"><ClipboardList className="mx-auto h-6 w-6 text-muted-foreground mb-2" /><h3 className="font-semibold text-foreground text-sm">Nenhuma tarefa para hoje.</h3><p className="text-xs text-muted-foreground">Gere um novo <Link href="/generate-weekly-plan" className="text-primary hover:underline">plano semanal</Link>.</p></div>}
                                </div>
                            </TabsContent>
                             <TabsContent value="proximos" className="mt-4">
                                 {isLoadingUpcoming ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : upcomingContent && upcomingContent.length > 0 ? (<div className="space-y-2">{upcomingContent.map(post => (<div key={post.id} className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"><div className="flex items-start gap-4 flex-1 overflow-hidden"><div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Tag className="h-5 w-5 text-muted-foreground" /></div><div className="flex-1 overflow-hidden"><p className="font-semibold text-foreground truncate text-sm">{post.title}</p><p className="text-xs text-muted-foreground">{post.contentType} • {formatDistanceToNow(post.date.toDate(), { addSuffix: true, locale: ptBR })}</p></div></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleMarkAsPublished(post.id)}><CheckCircle className="mr-2 h-4 w-4" /><span>Marcar como Publicado</span></DropdownMenuItem></DropdownMenu></DropdownMenu></div>))}</div>) : (<div className="text-center py-8"><p className="text-muted-foreground text-sm">Nenhum post agendado.</p><Button variant="link" asChild><Link href="/content-calendar">Ir para o Calendário</Link></Button></div>)}
                            </TabsContent>
                             <TabsContent value="ideias" className="mt-4">
                                {isLoadingIdeias ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : ideiasSalvas && ideiasSalvas.length > 0 ? <ul className="space-y-3">{ideiasSalvas.map((ideia) => (<li key={ideia.id} className="flex items-start gap-3"><Checkbox id={`ideia-${ideia.id}`} checked={ideia.concluido} onCheckedChange={() => handleToggleIdeia(ideia)} className="h-5 w-5 mt-0.5" /><div className="grid gap-0.5"><label htmlFor={`ideia-${ideia.id}`} className={cn('font-medium transition-colors cursor-pointer', ideia.concluido ? 'line-through text-muted-foreground' : 'text-foreground')}>{ideia.titulo}</label><p className="text-xs text-muted-foreground">de "{ideia.origem}"</p></div></li>))}</ul> : (<div className="text-center py-8"><p className="text-muted-foreground text-sm">Nenhuma ideia salva.</p><Button variant="link" asChild><Link href="/video-ideas">Gerar Novas Ideias</Link></Button></div>)}
                            </TabsContent>
                            <TabsContent value="atividade" className="mt-4">
                               <Sheet><SheetTrigger asChild><Button variant="outline" className="w-full"><Activity className="mr-2 h-4 w-4" /> Ver Atividade Recente</Button></SheetTrigger>
                                <SheetContent className="sm:max-w-4xl p-0">
                                    <SheetHeader className="p-6 pb-4 border-b"><SheetTitle>Atividade Recente nas Plataformas</SheetTitle></SheetHeader>
                                    <ScrollArea className="h-[calc(100vh-8rem)]">
                                        <div className="p-6">{isFetchingPosts ? <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div> : <div className='space-y-8'>{instaPosts && userProfile?.instagramHandle && <div><h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Instagram className="h-5 w-5"/> Instagram</h3><InstagramProfileResults profile={{ id: '', username: userProfile.instagramHandle, followersCount: parseMetric(userProfile.instagramFollowers), isPrivate: false, isBusiness: true, profilePicUrlHd: '', biography: '', fullName: '', mediaCount: 0, followingCount: 0 }} posts={instaPosts} formatNumber={formatNumber} error={null} /></div>}{tiktokPosts && userProfile?.tiktokHandle && <div><h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Film className="h-5 w-5"/> TikTok</h3><TikTokProfileResults profile={{ id: '', username: userProfile.tiktokHandle, followersCount: parseMetric(userProfile.tiktokFollowers), nickname: '', avatarUrl: '', bio: '', isVerified: false, isPrivate: false, heartsCount: 0, videoCount: 0, followingCount: 0 }} posts={tiktokPosts} formatNumber={formatNumber} error={null} onVideoClick={handleTikTokClick} /></div>}{!(instaPosts && userProfile?.instagramHandle) && !(tiktokPosts && userProfile?.tiktokHandle) && <div className="text-center py-10"><p className="text-muted-foreground">Integre suas contas no seu <Link href="/profile" className='text-primary font-semibold hover:underline'>perfil</Link> para ver seus posts aqui.</p></div>}</div>}</div>
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                            </TabsContent>
                         </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
    </>
  );
}

    
