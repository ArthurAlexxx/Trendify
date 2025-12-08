
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
import { collection, doc, query, orderBy, limit, updateDoc, where, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsightsOutput } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

const GoalCard = dynamic(() => import('@/components/dashboard/goal-card').then(mod => mod.GoalCard), {
  loading: () => <Skeleton className="h-full min-h-[380px]" />,
});

const DailyPlanCard = dynamic(() => import('@/components/dashboard/daily-plan-card').then(mod => mod.DailyPlanCard), {
  loading: () => <Skeleton className="h-full min-h-[250px]" />,
});

const ActionHubCard = dynamic(() => import('@/components/dashboard/action-hub-card').then(mod => mod.ActionHubCard), {
  loading: () => <Skeleton className="h-full min-h-[300px]" />,
});

const EngagementMetricsCard = dynamic(() => import('@/components/dashboard/engagement-metrics-card').then(mod => mod.EngagementMetricsCard), {
  loading: () => <Skeleton className="h-[140px]" />,
});

const EvolutionChartCard = dynamic(() => import('@/components/dashboard/evolution-chart-card'), {
    loading: () => <Skeleton className="h-[430px]" />,
});

const CorrelationChartCard = dynamic(() => import('@/components/dashboard/correlation-chart-card'), {
    loading: () => <Skeleton className="h-[430px]" />,
});

const PerformanceAnalysisCard = dynamic(() => import('@/components/dashboard/performance-analysis-card'), {
    loading: () => <Skeleton className="h-full min-h-[250px]" />,
});


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);

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
    firestore && user ? query(collection(firestore, `users/${user.uid}/ideiasSalvas`), where('concluido', '==', false), where('origem', '==', 'Ideias de Vídeo'), orderBy('createdAt', 'desc'), limit(5)) : null
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

  const instaPostsQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/instagramPosts`), orderBy('fetchedAt', 'desc'), limit(10)) : null
  ), [firestore, user]);
  const { data: instaPosts, isLoading: isLoadingInstaPosts } = useCollection<InstagramPostData>(instaPostsQuery);
  
  const tiktokPostsQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/tiktokPosts`), orderBy('fetchedAt', 'desc'), limit(10)) : null
  ), [firestore, user]);
  const { data: tiktokPosts, isLoading: isLoadingTiktokPosts } = useCollection<TikTokPost>(tiktokPostsQuery);


  const isLoading = isLoadingProfile || isLoadingUpcoming || isLoadingMetrics || isSubscriptionLoading || isLoadingIdeias || isLoadingWeeklyPlans || isLoadingInstaPosts || isLoadingTiktokPosts;
  
  const handleTikTokClick = (post: TikTokPost) => {
    if (post.shareUrl) {
        window.open(post.shareUrl, '_blank', 'noopener,noreferrer');
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
  }, [userProfile, selectedPlatform]);

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
                      className="w-full aspect-[9/16]"
                      allow="autoplay; encrypted-media;"
                  ></iframe>
              )}
          </DialogContent>
      </Dialog>

      <div className="space-y-8">
        <PageHeader
          icon={!userProfile?.photoURL ? LayoutGrid : undefined}
          imageUrl1={userProfile?.photoURL}
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
              <FollowerGoalSheet 
                userProfile={userProfile} 
                isOpen={isGoalSheetOpen} 
                setIsOpen={setIsGoalSheetOpen}
              >
                  <Button variant="outline" size="sm" className="w-full"><Pencil className="mr-2 h-4 w-4" /> Editar Metas</Button>
              </FollowerGoalSheet>
              }
          </div>
        </PageHeader>

        <div className="space-y-8">
          
          {userProfile && <ProfileCompletionAlert userProfile={userProfile} isPremium={isPremium} />}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-8">
                <Suspense fallback={<Skeleton className="h-[380px] w-full" />}>
                   <GoalCard 
                        isLoading={isLoading} 
                        goalFollowers={goalFollowers}
                        currentFollowers={currentFollowers}
                        formatMetricValue={formatMetricValue}
                        userProfile={userProfile}
                   />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-[250px] w-full" />}>
                  <DailyPlanCard 
                    isLoadingWeeklyPlans={isLoadingWeeklyPlans}
                    currentPlan={currentPlan} 
                    handleToggleRoteiro={handleToggleRoteiro} 
                  />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                 <ActionHubCard 
                    isLoadingUpcoming={isLoadingUpcoming}
                    upcomingContent={upcomingContent}
                    isLoadingIdeias={isLoadingIdeias}
                    ideiasSalvas={ideiasSalvas}
                    isFetchingPosts={isLoadingInstaPosts || isLoadingTiktokPosts}
                    instaProfile={userProfile}
                    instaPosts={instaPosts}
                    tiktokProfile={userProfile}
                    tiktokPosts={tiktokPosts}
                    handleToggleIdeia={handleToggleIdeia}
                    handleMarkAsPublished={handleMarkAsPublished}
                    handleTikTokClick={handleTikTokClick}
                    formatNumber={formatNumber}
                  />
                </Suspense>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-8">
              <Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
                <EngagementMetricsCard 
                    isLoading={isLoading} 
                    latestMetrics={latestMetrics}
                    formatMetricValue={formatMetricValue} 
                />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[430px] w-full" />}>
                <EvolutionChartCard
                  isLoading={isLoadingMetrics || isLoadingInstaPosts || isLoadingTiktokPosts}
                  metricSnapshots={metricSnapshots}
                  instaPosts={instaPosts}
                  tiktokPosts={tiktokPosts}
                  selectedPlatform={selectedPlatform}
                  userProfile={userProfile}
                  handleTikTokClick={handleTikTokClick}
                />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[430px] w-full" />}>
                <CorrelationChartCard
                  isLoading={isLoadingInstaPosts || isLoadingTiktokPosts}
                  instaPosts={instaPosts}
                  tiktokPosts={tiktokPosts}
                  selectedPlatform={selectedPlatform}
                  userProfile={userProfile}
                />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[250px] w-full" />}>
                <PerformanceAnalysisCard 
                    isGeneratingInsights={isGeneratingInsights}
                    insights={insights}
                    handleGenerateInsights={handleGenerateInsights}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
