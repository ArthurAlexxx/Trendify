
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
import { collection, doc, query, orderBy, limit, updateDoc, where, serverTimestamp, getDocs, setDoc, collectionGroup } from 'firebase/firestore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsightsOutput } from './actions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState, useMemo, useEffect, Suspense, useCallback, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { syncInstagramAction, syncTikTokAction } from './sync-actions';

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

const EvolutionChartCard = dynamic(() => import('./evolution-chart-card'), {
    loading: () => <Skeleton className="h-[438px]" />,
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
  const [currentTikTokUrl, setCurrentTikTokUrl] = useState('');
  const [insights, setInsights] = useState<DashboardInsightsOutput | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isSyncing, startSyncTransition] = useTransition();

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

  const userProfileRef = useMemoFirebase(() => (
      firestore && user ? doc(firestore, `users/${user.uid}`) : null
  ), [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  
  const metricSnapshotsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'metricSnapshots'), where('__name__', '>=', `users/${user.uid}/`), where('__name__', '<', `users/${user.uid}0/`)) : null),
    [firestore, user]
  );
  const { data: metricSnapshots, isLoading: isLoadingMetricSnapshots } = useCollection<MetricSnapshot>(metricSnapshotsQuery);
  

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

  const instaPostsQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/instagramPosts`), orderBy('fetchedAt', 'desc'), limit(15)) : null
  ), [firestore, user]);
  const { data: instaPosts, isLoading: isLoadingInstaPosts } = useCollection<InstagramPostData>(instaPostsQuery);
  
  const tiktokPostsQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/tiktokPosts`), orderBy('fetchedAt', 'desc'), limit(15)) : null
  ), [firestore, user]);
  const { data: tiktokPosts, isLoading: isLoadingTiktokPosts } = useCollection<TikTokPost>(tiktokPostsQuery);


  const isLoading = isLoadingProfile || isLoadingUpcoming || isSubscriptionLoading || isLoadingIdeias || isLoadingWeeklyPlans || isLoadingInstaPosts || isLoadingTiktokPosts || isLoadingMetricSnapshots;
  
  const handleSync = () => {
    if (!user || !userProfile) return;

    startSyncTransition(async () => {
        let successCount = 0;
        let errorCount = 0;
        
        if (userProfile.instagramHandle) {
            const result = await syncInstagramAction(user.uid, userProfile.instagramHandle);
            if (result.success) successCount++;
            else {
                errorCount++;
                toast({ title: 'Erro no Instagram', description: result.error, variant: 'destructive' });
            }
        }
        
        if (userProfile.tiktokHandle) {
            const result = await syncTikTokAction(user.uid, userProfile.tiktokHandle);
            if (result.success) successCount++;
            else {
                errorCount++;
                toast({ title: 'Erro no TikTok', description: result.error, variant: 'destructive' });
            }
        }
        
        if (successCount > 0 && errorCount === 0) {
            toast({ title: 'Sucesso!', description: 'Todas as métricas foram sincronizadas.' });
        } else if (successCount > 0 && errorCount > 0) {
            toast({ title: 'Sincronização Parcial', description: 'Algumas plataformas falharam ao sincronizar. Verifique as mensagens de erro.' });
        } else if (errorCount === 0 && successCount === 0) {
             toast({ title: 'Nenhuma plataforma conectada', description: 'Vá para a página de integrações para conectar suas contas.', variant: 'destructive' });
        }
    });
  };

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
      if (!userProfile || !metricSnapshots) {
          toast({ title: "Dados insuficientes", description: "Sincronize suas métricas para gerar uma análise.", variant: 'destructive' });
          return;
      }
      setIsGeneratingInsights(true);
      try {
          const formattedSnapshots = metricSnapshots.map(snap => ({
              date: snap.date.toDate().toISOString(),
              platform: snap.platform,
              followers: parseMetric(snap.followers),
              views: parseMetric(snap.views),
              likes: parseMetric(snap.likes),
              comments: parseMetric(snap.comments),
          }));

          const result = await generateDashboardInsights({
              metricSnapshots: formattedSnapshots,
              niche: userProfile.niche || 'Não definido',
              objective: 'Aumentar engajamento e crescimento',
          });
          setInsights(result);
      } catch (e: any) {
          toast({ title: "Erro ao gerar análise", description: e.message, variant: 'destructive' });
      } finally {
          setIsGeneratingInsights(false);
      }
  }, [userProfile, metricSnapshots, toast, parseMetric]);

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
              {isPremium && (
                <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm" className="w-full">
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sincronizar
                </Button>
              )}
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

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-8">
                <Suspense fallback={<Skeleton className="h-[380px] w-full" />}>
                   <GoalCard 
                        isLoading={isLoading} 
                        goalFollowers={goalFollowers}
                        currentFollowers={currentFollowers}
                        isGoalReached={isGoalReached}
                        onEditGoal={() => setIsGoalSheetOpen(true)}
                        formatMetricValue={formatMetricValue}
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
                        instaProfile={userProfile || null}
                        instaPosts={instaPosts || null}
                        tiktokProfile={userProfile || null}
                        tiktokPosts={tiktokPosts || null}
                        handleToggleIdeia={handleToggleIdeia}
                        handleMarkAsPublished={handleMarkAsPublished}
                        handleTikTokClick={handleTikTokClick}
                        formatNumber={formatMetricValue}
                    />
                </Suspense>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-8">
              <Suspense fallback={<Skeleton className="h-[140px] w-full" />}>
                <EngagementMetricsCard 
                    isLoading={isLoading} 
                    latestMetrics={latestMetrics}
                    formatIntegerValue={formatIntegerValue} 
                />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[438px] w-full" />}>
                <EvolutionChartCard
                  isLoading={isLoadingInstaPosts || isLoadingTiktokPosts || isLoadingMetricSnapshots}
                  metricSnapshots={metricSnapshots}
                  instaPosts={instaPosts}
                  tiktokPosts={tiktokPosts}
                  selectedPlatform={selectedPlatform}
                  userProfile={userProfile}
                  handleTikTokClick={handleTikTokClick}
                />
              </Suspense>
               <Suspense fallback={<Skeleton className="h-full min-h-[250px]" />}>
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
