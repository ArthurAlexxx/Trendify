'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Users,
  Pencil,
  Activity,
  Lightbulb,
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
import { useToast } from '@/hooks/use-toast';
import { FollowerGoalSheet } from '@/components/dashboard/follower-goal-sheet';
import { ProfileCompletionAlert } from '@/components/dashboard/profile-completion-alert';
import { generateDashboardInsights, type DashboardInsightsOutput } from '@/app/(app)/dashboard/actions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState, useMemo, useEffect, Suspense, useCallback, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import { syncInstagramAction, syncTikTokAction } from '@/app/(app)/dashboard/sync-actions';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

const GoalCard = dynamic(() => import('@/components/dashboard/goal-card'), {
  loading: () => <div className="h-full min-h-[380px] bg-muted rounded-2xl animate-pulse" />,
});

const DailyPlanCard = dynamic(() => import('@/components/dashboard/daily-plan-card'), {
  loading: () => <div className="h-full min-h-[250px] bg-muted rounded-2xl animate-pulse" />,
});

const ActionHubCard = dynamic(() => import('@/components/dashboard/action-hub-card'), {
  loading: () => <div className="h-full min-h-[300px] bg-muted rounded-2xl animate-pulse" />,
});

const EngagementMetricsCard = dynamic(() => import('@/app/(app)/dashboard/engagement-metrics-card'), {
  loading: () => <div className="h-[140px] bg-muted rounded-2xl animate-pulse" />,
});

const EvolutionChartCard = dynamic(() => import('@/app/(app)/dashboard/evolution-chart-card'), {
    loading: () => <div className="h-[438px] bg-muted rounded-2xl animate-pulse" />,
});

const PerformanceAnalysisCard = dynamic(() => import('@/components/dashboard/performance-analysis-card'), {
    loading: () => <div className="h-full min-h-[250px] bg-muted rounded-2xl animate-pulse" />,
});

// --- DADOS DE DEMONSTRAÇÃO ---
const demoUserProfile: UserProfile = {
  id: 'demo-user',
  displayName: 'Ana Clara',
  email: 'ana.clara@example.com',
  photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
  createdAt: Timestamp.now(),
  role: 'user',
  niche: 'Lifestyle e moda sustentável',
  totalFollowerGoal: 100000,
  instagramFollowerGoal: 70000,
  tiktokFollowerGoal: 30000,
  instagramHandle: '@anaclara.sustentavel',
  instagramFollowers: "52,3K",
  instagramAverageViews: "15,5K",
  instagramAverageLikes: "890",
  instagramAverageComments: "120",
  lastInstagramSync: Timestamp.now(),
  tiktokHandle: '@anaclara.eco',
  tiktokFollowers: "28,1K",
  tiktokAverageViews: "85K",
  tiktokAverageLikes: "10,2K",
  tiktokAverageComments: "350",
  lastTikTokSync: Timestamp.now(),
  subscription: { status: 'active', plan: 'premium', cycle: 'annual' },
};

const demoMetricSnapshots: MetricSnapshot[] = Array.from({ length: 30 }, (_, i) => ({
    id: `snap${i}`,
    date: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - i))),
    platform: i % 2 === 0 ? 'instagram' : 'tiktok',
    followers: (50000 - i * 150 + Math.sin(i / 3) * 500).toFixed(0),
    views: (20000 + Math.sin(i / 5) * 5000).toFixed(0),
    likes: (1200 + Math.sin(i / 2) * 200).toFixed(0),
    comments: (150 + Math.sin(i) * 50).toFixed(0),
}));


const demoWeeklyPlan: PlanoSemanal = {
  id: 'demo-plan',
  userId: 'demo-user',
  createdAt: Timestamp.now(),
  items: [
    { dia: 'Segunda', tarefa: 'Gravar 3 vídeos para a semana', detalhes: 'Um sobre moda, um sobre sustentabilidade, um sobre rotina.', concluido: true },
    { dia: 'Terça', tarefa: 'Responder todos os comentários do último post', detalhes: 'Focar em criar conversas e engajar com a audiência.', concluido: false },
  ],
  desempenhoSimulado: [], effortLevel: 'Médio', priorityIndex: [], realignmentTips: ''
};

const demoIdeiasSalvas: IdeiaSalva[] = [
  { id: '1', titulo: 'Receita vegana para o final de semana', origem: 'Ideias de Vídeo', concluido: false, createdAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
  { id: '2', titulo: 'Campanha para marca de cosméticos naturais', origem: 'Propostas & Publis', concluido: false, createdAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
];

const demoCompletedIdeas: IdeiaSalva[] = [
    { id: '3', titulo: 'Review do novo tênis ecológico', origem: 'Ideias de Vídeo', concluido: true, createdAt: Timestamp.now(), completedAt: Timestamp.now(), userId: 'demo-user', conteudo: '' },
];

const demoUpcomingContent: ConteudoAgendado[] = [
  { id: '1', title: 'Post sobre o Dia da Terra', contentType: 'Reels', date: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 1))), status: 'Agendado', createdAt: Timestamp.now(), userId: 'demo-user' },
];

const demoInstaPosts: InstagramPostData[] = Array.from({length: 5}, (_, i) => ({
    id: `insta${i}`, shortcode: 'Cq4n-d1g_Vd', caption: `Look do dia com a nova bolsa reciclada! O que acharam? #${i}`, mediaUrl: `https://picsum.photos/seed/${10+i}/300/400`, likes: 1200 + i*50, comments: 80+i*5, is_video: i % 2 === 0, video_view_count: i % 2 === 0 ? 15000 + i*1000 : 0, fetchedAt: Timestamp.now()
}));

const demoTiktokPosts: TikTokPost[] = Array.from({length: 5}, (_, i) => ({
    id: `tiktok${i}`, shareUrl: 'https://www.tiktok.com/@iamtabithabrown/video/7313835391307222315', description: `5 dicas para um armário mais sustentável #${i}`, coverUrl: `https://picsum.photos/seed/${20+i}/300/400`, views: 120000+i*5000, likes: 15000+i*200, comments: 300+i*10, fetchedAt: Timestamp.now()
}));

const demoInsights: DashboardInsightsOutput = {
    insights: ["Seu engajamento no TikTok cresceu 15% nos últimos 7 dias, continue com os vídeos curtos e dinâmicos.", "Os posts sobre 'rotina' no Instagram geram 30% mais salvamentos. Explore este formato.", "Apesar do alto alcance, a taxa de cliques nos stories com link caiu. Tente usar figurinhas de enquete antes do link."],
    trendAnalysis: { rising: ["Views no TikTok", "Salvamentos no Instagram"], falling: ["Taxa de cliques nos Stories"] },
    predictiveForecast: { next7days: "+ 2.500 seguidores", next30days: "+ 9.000 seguidores" },
    riskAlerts: ["Queda na frequência de posts pode afetar o alcance.", "Saturação do formato 'unboxing' no seu nicho."],
    recommendedActions: ["Fazer uma colaboração com outro criador de moda sustentável.", "Criar uma série de Reels respondendo às perguntas mais frequentes dos seguidores."],
    bestPostTime: "Terças e Quintas, por volta das 19h.",
    contentOpportunities: ["Criar um guia de 'marcas sustentáveis para conhecer em 2025'.", "Fazer um vídeo 'um dia comigo' focado em hábitos ecológicos."]
}


export default function AdminDashboardDemoPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);

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

  const { currentFollowers, goalFollowers, isGoalReached } = useMemo(() => {
    let current = 0;
    let goal = 0;

    switch (selectedPlatform) {
      case 'instagram':
        current = parseMetric(demoUserProfile.instagramFollowers);
        goal = demoUserProfile.instagramFollowerGoal || 0;
        break;
      case 'tiktok':
        current = parseMetric(demoUserProfile.tiktokFollowers);
        goal = demoUserProfile.tiktokFollowerGoal || 0;
        break;
      case 'total':
      default:
        current = parseMetric(demoUserProfile.instagramFollowers) + parseMetric(demoUserProfile.tiktokFollowers);
        goal = demoUserProfile.totalFollowerGoal || 0;
        break;
    }
    return { currentFollowers: current, goalFollowers: goal, isGoalReached: goal > 0 && current >= goal };
  }, [selectedPlatform, parseMetric]);
  
  const latestMetrics = useMemo(() => {
    const instaViews = parseMetric(demoUserProfile.instagramAverageViews);
    const tiktokViews = parseMetric(demoUserProfile.tiktokAverageViews);
    const instaLikes = parseMetric(demoUserProfile.instagramAverageLikes);
    const tiktokLikes = parseMetric(demoUserProfile.tiktokAverageLikes);
    const instaComments = parseMetric(demoUserProfile.instagramAverageComments);
    const tiktokComments = parseMetric(demoUserProfile.tiktokAverageComments);
    
    if (selectedPlatform === 'total') {
        const platformCount = [demoUserProfile.instagramHandle, demoUserProfile.tiktokHandle].filter(Boolean).length || 1;
        const totalViews = (instaViews + tiktokViews)
        const totalLikes = (instaLikes + tiktokLikes)
        const totalComments = (instaComments + tiktokComments)

        return {
            followers: parseMetric(demoUserProfile.instagramFollowers) + parseMetric(demoUserProfile.tiktokFollowers),
            views: platformCount > 1 ? totalViews / platformCount : totalViews,
            likes: platformCount > 1 ? totalLikes / platformCount : totalLikes,
            comments: platformCount > 1 ? totalComments / platformCount : totalComments,
        }
    }
    return selectedPlatform === 'instagram' ? {
        followers: parseMetric(demoUserProfile.instagramFollowers),
        views: instaViews,
        likes: instaLikes,
        comments: instaComments,
    } : {
        followers: parseMetric(demoUserProfile.tiktokFollowers),
        views: tiktokViews,
        likes: tiktokLikes,
        comments: tiktokComments,
    }
  }, [selectedPlatform, parseMetric]);
  
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bem-vindo(a), ${demoUserProfile.displayName?.split(' ')[0]}!`}
        description="Seu centro de comando para crescimento e monetização."
        imageUrl={demoUserProfile.photoURL}
      >
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
              <TabsList>
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="tiktok">TikTok</TabsTrigger>
              </TabsList>
            </Tabs>
            <FollowerGoalSheet 
                userProfile={demoUserProfile} 
                isOpen={isGoalSheetOpen} 
                setIsOpen={setIsGoalSheetOpen}
                isGoalReached={isGoalReached}
            >
                <Button variant="outline" size="sm" className="w-full">
                    <Pencil className="mr-2 h-4 w-4" /> Editar Metas
                </Button>
            </FollowerGoalSheet>
        </div>
      </PageHeader>

      <div className="space-y-8">
        <ProfileCompletionAlert userProfile={demoUserProfile} isPremium={true} />
        
        <div className="md:hidden">
            <Carousel className="w-full" opts={{ align: "start", loop: true }}>
              <CarouselContent className="-ml-4">
                <CarouselItem className="pl-4 basis-[90%] pb-8"><div className="p-1 h-full"><GoalCard isLoading={false} goalFollowers={goalFollowers} currentFollowers={currentFollowers} isGoalReached={isGoalReached} onEditGoal={() => setIsGoalSheetOpen(true)} formatMetricValue={formatMetricValue} /></div></CarouselItem>
                <CarouselItem className="pl-4 basis-[90%] pb-8"><div className="p-1 h-full"><EngagementMetricsCard isLoading={false} latestMetrics={latestMetrics} formatIntegerValue={formatIntegerValue} /></div></CarouselItem>
              </CarouselContent>
            </Carousel>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
          <div className="xl:col-span-2 space-y-8">
             <div className="hidden md:block"><GoalCard isLoading={false} goalFollowers={goalFollowers} currentFollowers={currentFollowers} isGoalReached={isGoalReached} onEditGoal={() => setIsGoalSheetOpen(true)} formatMetricValue={formatMetricValue} /></div>
             <DailyPlanCard isLoadingWeeklyPlans={false} currentPlan={demoWeeklyPlan} handleToggleRoteiro={() => {}} />
             <ActionHubCard isLoadingUpcoming={false} upcomingContent={demoUpcomingContent} isLoadingIdeias={false} ideiasSalvas={demoIdeiasSalvas} completedIdeas={demoCompletedIdeas} isLoadingCompleted={false} handleToggleIdeia={() => {}} handleMarkAsPublished={() => {}} />
          </div>
          <div className="xl:col-span-3 space-y-8">
            <div className="hidden md:block"><EngagementMetricsCard isLoading={false} latestMetrics={latestMetrics} formatIntegerValue={formatIntegerValue} /></div>
            <EvolutionChartCard isLoading={false} metricSnapshots={demoMetricSnapshots} instaPosts={demoInstaPosts} tiktokPosts={demoTiktokPosts} selectedPlatform={selectedPlatform} userProfile={demoUserProfile} onItemClick={() => {}}/>
            <PerformanceAnalysisCard isGeneratingInsights={false} insights={demoInsights} handleGenerateInsights={() => {}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
