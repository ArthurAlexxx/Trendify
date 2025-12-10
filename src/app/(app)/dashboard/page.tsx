
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
import dynamic from 'next/dynamic';
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

const GoalCard = dynamic(() => import('@/components/dashboard/goal-card'), {
  loading: () => <Skeleton className="h-full min-h-[380px]" />,
});

const DailyPlanCard = dynamic(() => import('@/components/dashboard/daily-plan-card'), {
  loading: () => <Skeleton className="h-full min-h-[250px]" />,
});

const ActionHubCard = dynamic(() => import('@/components/dashboard/action-hub-card'), {
  loading: () => <Skeleton className="h-full min-h-[300px]" />,
});

const EngagementMetricsCard = dynamic(() => import('@/app/(app)/dashboard/engagement-metrics-card'), {
  loading: () => <Skeleton className="h-[140px]" />,
});

const EvolutionChartCard = dynamic(() => import('./evolution-chart-card'), {
    loading: () => <Skeleton className="h-[438px]" />,
});

const PerformanceAnalysisCard = dynamic(() => import('@/components/dashboard/performance-analysis-card'), {
    loading: () => <Skeleton className="h-full min-h-[250px]" />,
});


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

// --- MOCK DATA ---
const mockUserProfile: UserProfile = {
    id: 'demo-user',
    displayName: 'Ana Clara',
    email: 'ana.clara@example.com',
    photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    createdAt: Timestamp.now(),
    role: 'user',
    niche: 'Lifestyle e moda sustentável',
    instagramHandle: '@anaclara.style',
    tiktokHandle: '@anaclarastyle',
    totalFollowerGoal: 250000,
    instagramFollowerGoal: 150000,
    tiktokFollowerGoal: 100000,
    instagramFollowers: '125K',
    instagramAverageViews: '35.5K',
    instagramAverageLikes: '2.1K',
    instagramAverageComments: '350',
    tiktokFollowers: '85K',
    tiktokAverageViews: '150K',
    tiktokAverageLikes: '12.5K',
    tiktokAverageComments: '890',
};

const mockMetricSnapshots: MetricSnapshot[] = Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (15 - i));
    return {
        id: `snap${i}`,
        date: Timestamp.fromDate(date),
        platform: 'instagram',
        followers: (110000 + i * 1000).toString(),
        views: (30000 + i * 300).toString(),
        likes: (2000 + i * 50).toString(),
        comments: (300 + i * 10).toString(),
    };
});

const mockWeeklyPlan: PlanoSemanal = {
    id: 'plan1',
    userId: 'demo-user',
    createdAt: Timestamp.now(),
    items: [
        { dia: 'Terça', tarefa: 'Gravar Reel sobre "3 formas de usar uma camisa branca"', detalhes: 'Focar em transições rápidas e música em alta.', concluido: true },
        { dia: 'Terça', tarefa: 'Interagir com 10 perfis do mesmo nicho', detalhes: 'Deixar comentários genuínos para aumentar a visibilidade.', concluido: false },
    ],
    desempenhoSimulado: [],
    effortLevel: 'Médio',
    priorityIndex: [],
    realignmentTips: '',
};

const mockIdeiasSalvas: IdeiaSalva[] = [
    { id: 'idea1', titulo: 'Review do novo serum da marca X', origem: 'Ideias de Vídeo', concluido: false, createdAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
    { id: 'idea2', titulo: 'Collab com @outracriadora sobre moda circular', origem: 'Ideias de Vídeo', concluido: false, createdAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
];
const mockCompletedIdeas: IdeiaSalva[] = [
    { id: 'idea3', titulo: 'Segredo Revelado: A Ordem Correta do Skincare', origem: 'Ideias de Vídeo', concluido: true, createdAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
];


const mockUpcomingContent: ConteudoAgendado[] = [
    { id: 'cont1', title: 'Post: Lançamento do lookbook de inverno', contentType: 'Post', status: 'Agendado', date: Timestamp.fromDate(new Date()), userId: 'demo-user', createdAt: Timestamp.now() },
    { id: 'cont2', title: 'Story: Enquete sobre próximos vídeos', contentType: 'Story', status: 'Agendado', date: Timestamp.fromDate(new Date()), userId: 'demo-user', createdAt: Timestamp.now() },
];

const mockInstaPosts: InstagramPostData[] = [
    { id: 'insta1', shortcode: '', caption: 'Um dia incrível na praia, aproveitando o sol!', mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723a996f329?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', likes: 2500, comments: 150, is_video: false, fetchedAt: Timestamp.now() },
    { id: 'insta2', shortcode: '', caption: 'Provando o novo café da cidade. Recomendo!', mediaUrl: 'https://images.unsplash.com/photo-1511920183359-b1a7d5891341?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', likes: 1800, comments: 95, is_video: false, fetchedAt: Timestamp.now() },
];
const mockTiktokPosts: TikTokPost[] = [
     { id: 'tiktok1', description: 'Challenge de dança que deu (quase) certo!', coverUrl: 'https://images.unsplash.com/photo-1516974409955-1f19b0654877?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', views: 250000, likes: 22000, comments: 1200, fetchedAt: Timestamp.now() },
     { id: 'tiktok2', description: 'Tutorial rápido de maquiagem para o dia a dia.', coverUrl: 'https://images.unsplash.com/photo-1620421682332-1b6a65234552?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', views: 180000, likes: 15000, comments: 850, fetchedAt: Timestamp.now() },
];

const mockInsights: DashboardInsightsOutput = {
    insights: ["Seus vídeos de tutorial estão com uma taxa de salvamento 30% maior, indicando alto valor percebido.", "A taxa de engajamento em posts sobre sustentabilidade cresceu 15% na última semana.", "Seus stories com enquetes têm o dobro de interações em comparação com os de perguntas e respostas."],
    trendAnalysis: { rising: ["Taxa de Salvamento", "Engajamento em Stories"], falling: ["Alcance de Reels"] },
    predictiveForecast: { next7days: "+ 3.500 seguidores", next30days: "+ 12.000 seguidores" },
    riskAlerts: ["O alcance dos Reels diminuiu 10%. Pode ser saturação do formato atual ou mudança no algoritmo.", "A frequência de posts diminuiu, o que pode impactar a entrega do seu conteúdo."],
    recommendedActions: ["Crie uma série de tutoriais rápidos para capitalizar a alta taxa de salvamento.", "Faça uma colaboração com outro criador do nicho de moda sustentável para expandir o alcance.", "Teste novos formatos de Reels, como 'POV' ou 'Get Ready With Me'."],
    bestPostTime: "Terças e Quintas, entre 18h e 20h.",
    contentOpportunities: ["Criar um guia compilado dos seus melhores tutoriais.", "Fazer uma live sobre 'Como construir um guarda-roupa cápsula sustentável'."]
}
// --- END OF MOCK DATA ---


export default function DashboardPage() {
  // const { user, auth } = useUser();
  // const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');
  
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);
  // const [insights, setInsights] = useState<DashboardInsightsOutput | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  const [selectedChartItem, setSelectedChartItem] = useState<any>(null);

  // const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  // const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

  // --- USE MOCK DATA ---
  const user = { uid: 'demo-user' }; // mock user
  const userProfile = mockUserProfile;
  const metricSnapshots = mockMetricSnapshots;
  const weeklyPlansData = [mockWeeklyPlan];
  const currentPlan = weeklyPlansData?.[0];
  const ideiasSalvas = mockIdeiasSalvas;
  const completedIdeas = mockCompletedIdeas;
  const upcomingContent = mockUpcomingContent;
  const instaPosts = mockInstaPosts;
  const tiktokPosts = mockTiktokPosts;
  const insights = mockInsights;
  const isPremium = true;
  const isLoading = false; // Set loading to false since we use mock data
  // --- END OF MOCK DATA USAGE ---


  const handleChartItemClick = (item: any) => {
    setSelectedChartItem(item);
  }
  
  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    toast({ title: "Ação de demonstração."});
  };

  const handleMarkAsPublished = async (postId: string) => {
    toast({ title: "Ação de demonstração."});
  };

  const handleToggleRoteiro = async (itemIndex: number) => {
     toast({ title: "Ação de demonstração."});
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
     toast({ title: "Ação de demonstração."});
  }, [toast]);

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
          imageUrl={userProfile?.photoURL}
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
            {/* Mobile Carousel View */}
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent className="-ml-4">
                    <CarouselItem className="pl-4 basis-[90%] pb-8">
                      <div className="p-1 h-full">
                        <GoalCard 
                          isLoading={isLoading} 
                          goalFollowers={goalFollowers}
                          currentFollowers={currentFollowers}
                          isGoalReached={isGoalReached}
                          onEditGoal={() => setIsGoalSheetOpen(true)}
                          formatMetricValue={formatMetricValue}
                        />
                      </div>
                    </CarouselItem>
                    <CarouselItem className="pl-4 basis-[90%] pb-8">
                      <div className="p-1 h-full">
                        <EngagementMetricsCard 
                          isLoading={isLoading} 
                          latestMetrics={latestMetrics}
                          formatIntegerValue={formatIntegerValue} 
                        />
                      </div>
                    </CarouselItem>
                  </CarouselContent>
                </Carousel>
            </div>
            
            {/* Common Layout for the main content */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
              {/* Left Column (Desktop) / Second section (Mobile) */}
              <div className="xl:col-span-2 space-y-8">
                 <div className="hidden md:block">
                  <GoalCard 
                    isLoading={isLoading} 
                    goalFollowers={goalFollowers}
                    currentFollowers={currentFollowers}
                    isGoalReached={isGoalReached}
                    onEditGoal={() => setIsGoalSheetOpen(true)}
                    formatMetricValue={formatMetricValue}
                  />
                 </div>
                 <DailyPlanCard 
                    isLoadingWeeklyPlans={isLoading}
                    currentPlan={currentPlan} 
                    handleToggleRoteiro={handleToggleRoteiro} 
                  />
                 <ActionHubCard 
                    isLoadingUpcoming={isLoading}
                    upcomingContent={upcomingContent}
                    isLoadingIdeias={isLoading}
                    ideiasSalvas={ideiasSalvas}
                    completedIdeas={completedIdeas}
                    isLoadingCompleted={isLoading}
                    handleToggleIdeia={handleToggleIdeia}
                    handleMarkAsPublished={handleMarkAsPublished}
                  />
              </div>

              {/* Right Column (Desktop) / First section (Mobile) */}
              <div className="xl:col-span-3 space-y-8">
                <div className="hidden md:block">
                    <EngagementMetricsCard 
                      isLoading={isLoading} 
                      latestMetrics={latestMetrics}
                      formatIntegerValue={formatIntegerValue} 
                    />
                </div>
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
          </Suspense>
        </div>
      </div>
    </>
  );
}
