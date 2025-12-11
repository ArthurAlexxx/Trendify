
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Users,
  Eye,
  Heart,
  MessageSquare,
  LayoutGrid,
  ClipboardList,
  Target,
  Pencil,
  Activity,
  Lightbulb,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  BarChartHorizontal,
  Percent,
  RefreshCw,
  Loader2,
  PlayCircle,
  Upload,
  CheckCircle,
} from 'lucide-react';
import type {
  IdeiaSalva,
  ConteudoAgendado,
  UserProfile,
  MetricSnapshot,
  InstagramPostData,
  TikTokPost,
  PlanoSemanal,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, updateDoc, where, serverTimestamp, getDocs, setDoc, collectionGroup, Timestamp } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsightsOutput } from './actions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState, useMemo, useEffect, Suspense, useCallback, useTransition, useRef } from 'react';
import { syncInstagramAction, syncTikTokAction } from './sync-actions';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import GoalCard from '@/components/dashboard/goal-card';
import DailyPlanCard from '@/components/dashboard/daily-plan-card';
import ActionHubCard from '@/components/dashboard/action-hub-card';
import PerformanceAnalysisCard from '@/app/(app)/dashboard/performance-analysis-card';
import EvolutionChartCard from '@/app/(app)/dashboard/evolution-chart-card';
import EngagementMetricsCard from '@/app/(app)/dashboard/engagement-metrics-card';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-1 space-y-8">
        <Skeleton className="h-[380px] w-full" />
        <Skeleton className="h-[250px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
      <div className="lg:col-span-2 space-y-8">
        <Skeleton className="h-[140px] w-full" />
        <Skeleton className="h-[438px] w-full" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    </div>
  );
}

function CheckoutStatusHandler() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [hasShownToast, setHasShownToast] = useState(false);

    useEffect(() => {
        const checkoutStatus = searchParams.get('checkout');
        if (checkoutStatus === 'success' && !hasShownToast) {
            toast({
                title: "Pagamento Aprovado!",
                description: "Seu plano foi atualizado. Bem-vindo(a) à experiência completa!",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                duration: 8000,
            });
            setHasShownToast(true);
        }
    }, [searchParams, toast, hasShownToast]);

    return null;
}


export default function DashboardPage() {
  const { user, auth } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');
  
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);
  const [insights, setInsights] = useState<DashboardInsightsOutput | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  const [selectedChartItem, setSelectedChartItem] = useState<any>(null);

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const metricSnapshotsQuery = useMemoFirebase(
      () => user && firestore ? query(collection(firestore, `users/${user.uid}/metricSnapshots`), orderBy('date', 'desc'), limit(60)) : null,
      [user, firestore]
  )
  const { data: metricSnapshots, isLoading: isLoadingMetrics } = useCollection<MetricSnapshot>(metricSnapshotsQuery);

  const weeklyPlansQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, `users/${user.uid}/weeklyPlans`), orderBy('createdAt', 'desc'), limit(1)) : null,
    [user, firestore]
  );
  const { data: weeklyPlansData, isLoading: isLoadingWeeklyPlans } = useCollection<PlanoSemanal>(weeklyPlansQuery);
  const currentPlan = weeklyPlansData?.[0];

  const ideiasSalvasQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            where('concluido', '==', false),
            orderBy('createdAt', 'desc')
          )
        : null,
    [user, firestore]
  );
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } = useCollection<IdeiaSalva>(ideiasSalvasQuery);


  const completedIdeasQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            where('concluido', '==', true),
            orderBy('completedAt', 'desc'),
          )
        : null,
    [user, firestore]
  );
  const { data: completedIdeas, isLoading: isLoadingCompleted } = useCollection<IdeiaSalva>(completedIdeasQuery);


  const upcomingContentQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/conteudoAgendado`),
            where('status', '==', 'Agendado'),
            orderBy('date', 'asc'),
            limit(3)
          )
        : null,
    [user, firestore]
  );
  const { data: upcomingContent, isLoading: isLoadingUpcoming } = useCollection<ConteudoAgendado>(upcomingContentQuery);

  const instaPostsQuery = useMemoFirebase(
      () => user && firestore ? query(collection(firestore, `users/${user.uid}/instagramPosts`), orderBy('fetchedAt', 'desc'), limit(10)) : null,
      [user, firestore]
  )
  const { data: instaPosts, isLoading: isLoadingInstaPosts } = useCollection<InstagramPostData>(instaPostsQuery);

  const tiktokPostsQuery = useMemoFirebase(
      () => user && firestore ? query(collection(firestore, `users/${user.uid}/tiktokPosts`), orderBy('fetchedAt', 'desc'), limit(10)) : null,
      [user, firestore]
  )
  const { data: tiktokPosts, isLoading: isLoadingTiktokPosts } = useCollection<TikTokPost>(tiktokPostsQuery);

  const isLoading =
    isProfileLoading ||
    isLoadingMetrics ||
    isLoadingWeeklyPlans ||
    isLoadingIdeias ||
    isLoadingUpcoming ||
    isLoadingCompleted ||
    isLoadingInstaPosts ||
    isLoadingTiktokPosts;


  const handleChartItemClick = (item: any) => {
    setSelectedChartItem(item);
  }
  
  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    if (!user || !firestore) return;
    const ideaRef = doc(firestore, `users/${user.uid}/ideiasSalvas`, ideia.id);
    try {
      await updateDoc(ideaRef, {
        concluido: !ideia.concluido,
        completedAt: !ideia.concluido ? serverTimestamp() : null,
      });
      toast({
        title: 'Sucesso!',
        description: `Ideia marcada como ${!ideia.concluido ? 'concluída' : 'pendente'}.`,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar ideia', description: e.message, variant: 'destructive' });
    }
  };

  const handleMarkAsPublished = async (postId: string) => {
    if (!user || !firestore) return;
    const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, postId);
    try {
        await updateDoc(postRef, { status: 'Publicado' });
        toast({ title: 'Sucesso!', description: 'Post marcado como publicado.' });
    } catch (e: any) {
        toast({ title: 'Erro ao atualizar post', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleRoteiro = async (itemIndex: number) => {
    if (!firestore || !currentPlan || !user) return;

    const planRef = doc(firestore, `users/${user.uid}/weeklyPlans`, currentPlan.id);
    const updatedItems = currentPlan.items.map((item, index) =>
      index === itemIndex ? { ...item, concluido: !item.concluido } : item
    );

    try {
      await updateDoc(planRef, { items: updatedItems });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar tarefa', description: e.message, variant: 'destructive' });
    }
  };

  const parseMetric = useCallback((value?: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
    return isNaN(num) ? 0 : num;
  }, []);
  
  const formatMetricValue = (value?: string | number): string => {
    const num = parseMetric(value);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
    if (num >= 1000) return num.toLocaleString('pt-BR');
    return String(num);
  };
  
  const formatIntegerValue = (value?: string | number): string => {
    const num = parseMetric(value);
    return Math.round(num).toLocaleString('pt-BR');
  };

  const handleGenerateInsights = useCallback(async () => {
    if (!isPremium) {
      toast({
        title: "Funcionalidade Premium",
        description: "A análise de desempenho com IA está disponível no plano Premium.",
      });
      return;
    }
    if (!metricSnapshots || metricSnapshots.length < 2) {
      toast({
        title: "Dados Insuficientes",
        description: "Sincronize suas métricas por pelo menos 2 dias para gerar insights.",
        variant: "destructive"
      });
      return;
    }
    if (!userProfile?.niche || !userProfile?.totalFollowerGoal) {
       toast({
        title: "Perfil Incompleto",
        description: "Por favor, defina seu nicho e sua meta de seguidores no seu perfil.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingInsights(true);
    try {
       const plainMetricSnapshots = metricSnapshots.map(s => {
        // Ensure 's.date' is a Firestore Timestamp before calling .toDate()
        const date = (s.date instanceof Timestamp) ? s.date.toDate() : new Date(s.date);
        
        return {
          // No direct complex objects passed
          date: date.toISOString(), 
          platform: s.platform,
          followers: parseMetric(s.followers),
          views: parseMetric(s.views),
          likes: parseMetric(s.likes),
          comments: parseMetric(s.comments),
        };
      });


      const result = await generateDashboardInsights({
        metricSnapshots: plainMetricSnapshots,
        niche: userProfile.niche,
        objective: `Atingir a meta de ${userProfile.totalFollowerGoal} seguidores.`,
      });
      setInsights(result);
    } catch (e: any) {
      toast({ title: "Erro ao Gerar Insights", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [isPremium, metricSnapshots, userProfile, parseMetric, toast]);

  const { currentFollowers, goalFollowers, isGoalReached } = useMemo(() => {
    if (!userProfile) return { currentFollowers: 0, goalFollowers: 0, isGoalReached: false };
    
    let current = 0;
    let goal = 0;

    switch (selectedPlatform) {
      case 'instagram':
        current = parseMetric(userProfile.instagramFollowers);
        goal = userProfile.instagramFollowerGoal || 0;
        break;
      case 'tiktok':
        current = parseMetric(userProfile.tiktokFollowers);
        goal = userProfile.tiktokFollowerGoal || 0;
        break;
      case 'total':
      default:
        current = parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers);
        goal = userProfile.totalFollowerGoal || 0;
        break;
    }
    return { currentFollowers: current, goalFollowers: goal, isGoalReached: goal > 0 && current >= goal };
  }, [userProfile, selectedPlatform, parseMetric]);
  
  const latestMetrics = useMemo(() => {
    if (!userProfile) return null;

    const instaViews = parseMetric(userProfile.instagramAverageViews);
    const tiktokViews = parseMetric(userProfile.tiktokAverageViews);
    const instaLikes = parseMetric(userProfile.instagramAverageLikes);
    const tiktokLikes = parseMetric(userProfile.tiktokAverageLikes);
    const instaComments = parseMetric(userProfile.instagramAverageComments);
    const tiktokComments = parseMetric(userProfile.tiktokAverageComments);
    
    if (selectedPlatform === 'total') {
        const platformCount = [userProfile.instagramHandle, userProfile.tiktokHandle].filter(Boolean).length || 1;
        const totalViews = (instaViews + tiktokViews)
        const totalLikes = (instaLikes + tiktokLikes)
        const totalComments = (instaComments + tiktokComments)

        return {
            followers: parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers),
            views: platformCount > 1 ? totalViews / platformCount : totalViews,
            likes: platformCount > 1 ? totalLikes / platformCount : totalLikes,
            comments: platformCount > 1 ? totalComments / platformCount : totalComments,
        }
    }
    return selectedPlatform === 'instagram' ? {
        followers: parseMetric(userProfile.instagramFollowers),
        views: instaViews,
        likes: instaLikes,
        comments: instaComments,
    } : {
        followers: parseMetric(userProfile.tiktokFollowers),
        views: tiktokViews,
        likes: tiktokLikes,
        comments: tiktokComments,
    }
  }, [userProfile, selectedPlatform, parseMetric]);
  
  return (
    <>
      <Suspense fallback={null}>
        <CheckoutStatusHandler />
      </Suspense>
      <div className="space-y-8">
        <PageHeader
          title={`Bem-vindo(a), ${userProfile?.displayName?.split(' ')[0] || 'Criador'}!`}
          description="Seu centro de comando para crescimento e monetização."
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
                <TabsList className="bg-zinc-800 p-2">
                  <TabsTrigger value="total" className="text-white data-[state=active]:bg-black px-4 py-2 text-sm">Total</TabsTrigger>
                  <TabsTrigger value="instagram" className="text-white data-[state=active]:bg-black px-4 py-2 text-sm">Instagram</TabsTrigger>
                  <TabsTrigger value="tiktok" className="text-white data-[state=active]:bg-black px-4 py-2 text-sm">TikTok</TabsTrigger>
                </TabsList>
              </Tabs>
              {userProfile && 
                <FollowerGoalSheet 
                    userProfile={userProfile} 
                    isOpen={isGoalSheetOpen} 
                    setIsOpen={setIsGoalSheetOpen}
                    isGoalReached={isGoalReached}
                >
                    <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="mr-2 h-4 w-4" /> Editar Metas
                    </Button>
              </FollowerGoalSheet>
              }
          </div>
        </PageHeader>

        <div className="space-y-8">
          
          {userProfile && <ProfileCompletionAlert userProfile={userProfile} isPremium={isPremium} />}

          <Suspense fallback={<DashboardSkeleton />}>
             {isLoading ? <DashboardSkeleton /> : (
            <>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
              <div className="xl:col-span-2 space-y-8">
                 <GoalCard 
                    isLoading={isLoading} 
                    goalFollowers={goalFollowers}
                    currentFollowers={currentFollowers}
                    isGoalReached={isGoalReached}
                    onEditGoal={() => setIsGoalSheetOpen(true)}
                    formatMetricValue={formatMetricValue}
                  />
                 <DailyPlanCard 
                    isLoadingWeeklyPlans={isLoadingWeeklyPlans}
                    currentPlan={currentPlan} 
                    handleToggleRoteiro={handleToggleRoteiro} 
                  />
                 <ActionHubCard 
                    isLoadingUpcoming={isLoadingUpcoming}
                    upcomingContent={upcomingContent}
                    isLoadingIdeias={isLoadingIdeias}
                    ideiasSalvas={ideiasSalvas}
                    completedIdeas={completedIdeas}
                    isLoadingCompleted={isLoadingCompleted}
                    handleToggleIdeia={handleToggleIdeia}
                    handleMarkAsPublished={handleMarkAsPublished}
                  />
              </div>
              <div className="xl:col-span-3 space-y-8">
                <EngagementMetricsCard 
                    isLoading={isLoading} 
                    latestMetrics={latestMetrics}
                    formatIntegerValue={formatIntegerValue} 
                />
                <EvolutionChartCard
                  isLoading={isLoading}
                  metricSnapshots={metricSnapshots}
                  instaPosts={instaPosts}
                  tiktokPosts={tiktokPosts}
                  selectedPlatform={selectedPlatform}
                  userProfile={userProfile}
                  onItemClick={handleChartItemClick}
                />
                <PerformanceAnalysisCard 
                  isGeneratingInsights={isGeneratingInsights}
                  insights={insights}
                  handleGenerateInsights={handleGenerateInsights}
                />
              </div>
            </div>
            </>
             )}
          </Suspense>
        </div>
      </div>
    </>
  );
}
