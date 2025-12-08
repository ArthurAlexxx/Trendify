
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, LabelList, Area, AreaChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, Percent, BarChartHorizontal, ClipboardList, Activity } from 'lucide-react';
import type { MetricSnapshot, InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

const chartConfigBase: ChartConfig = {
  views: { label: "Views", color: "hsl(var(--chart-2))"  },
  likes: { label: "Likes", color: "hsl(var(--chart-3))"  },
  comments: { label: "Comentários", color: "hsl(var(--chart-4))"  },
  engagementRate: { label: "Engajamento (%)", color: "hsl(var(--chart-5))" },
};

interface EvolutionChartCardProps {
    isLoading: boolean;
    metricSnapshots: MetricSnapshot[] | null;
    instaPosts: InstagramPostData[] | null;
    tiktokPosts: TikTokPost[] | null;
    selectedPlatform: 'total' | 'instagram' | 'tiktok';
    userProfile: UserProfile | null;
    handleTikTokClick: (post: TikTokPost) => void;
}

export default function EvolutionChartCard({ isLoading, metricSnapshots, instaPosts, tiktokPosts, selectedPlatform, userProfile, handleTikTokClick }: EvolutionChartCardProps) {
  const [chartView, setChartView] = useState<'evolution' | 'engagementRate' | 'topPosts' | 'postAnalysis'>('evolution');

  const parseMetric = (value?: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
    return isNaN(num) ? 0 : num;
  };
  
  const allPosts = useMemo(() => {
     let combined: (InstagramPostData | TikTokPost)[] = [];
     if(selectedPlatform === 'instagram') {
        combined = [...(instaPosts || [])];
     } else if (selectedPlatform === 'tiktok') {
        combined = [...(tiktokPosts || [])];
     } else {
        combined = [...(instaPosts || []), ...(tiktokPosts || [])];
     }
     
     return combined.map(p => {
        if ('shortcode' in p) { // InstagramPostData
            const followers = selectedPlatform === 'total' ? (parseMetric(userProfile?.instagramFollowers) + parseMetric(userProfile?.tiktokFollowers)) : parseMetric(userProfile?.instagramFollowers);
            const engagement = (p.likes + p.comments) / (followers || 1) * 100;
            return {
                id: p.id,
                name: p.caption?.substring(0, 25) || `Post ${p.id.substring(0, 4)}`,
                views: p.video_view_count ?? 0,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: `https://www.instagram.com/p/${p.shortcode}`,
                type: 'instagram' as const,
                post: p,
            }
        } else { // TikTokPost
             const followers = selectedPlatform === 'total' ? (parseMetric(userProfile?.instagramFollowers) + parseMetric(userProfile?.tiktokFollowers)) : parseMetric(userProfile?.tiktokFollowers);
             const engagement = (p.likes + p.comments) / (followers || 1) * 100;
             return {
                id: p.id,
                name: p.description?.substring(0, 25) || `Video ${p.id.substring(0, 4)}`,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: p.shareUrl,
                type: 'tiktok' as const,
                post: p,
            }
        }
     }).sort((a, b) => ('fetchedAt' in a.post && 'fetchedAt' in b.post) ? (a.post.fetchedAt?.toMillis() ?? 0) - (b.post.fetchedAt?.toMillis() ?? 0) : 0);
  }, [instaPosts, tiktokPosts, userProfile, selectedPlatform]);

  const topPostsData = useMemo(() => {
     return allPosts.sort((a,b) => b.engagement - a.engagement).slice(0, 5);
  }, [allPosts]);
  
  const postEvolutionData = useMemo(() => {
    return allPosts.slice(-15).map((p, index) => ({
      name: `Post ${index + 1}`,
      tooltipName: p.name,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
    }));
  }, [allPosts]);

  const postEngagementRateData = useMemo(() => {
    return allPosts.slice(-15).map((p, index) => ({
      name: `Post ${index + 1}`,
      tooltipName: p.name,
      engagementRate: p.engagement,
    }));
  }, [allPosts]);

  const scatterData = useMemo(() => {
    return allPosts.filter(p => p.views > 0 && p.likes > 0);
  }, [allPosts]);

  const trendlineData = useMemo(() => {
    if (scatterData.length < 2) return [];
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = scatterData.length;

    scatterData.forEach(p => {
        sumX += p.views;
        sumY += p.likes;
        sumXY += p.views * p.likes;
        sumXX += p.views * p.views;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...scatterData.map(p => p.views));
    const maxX = Math.max(...scatterData.map(p => p.views));
    
    return [
        { views: minX, likes: slope * minX + intercept },
        { views: maxX, likes: slope * maxX + intercept },
    ];

  }, [scatterData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.tooltipName || label}
            </span>
             {payload.map((p: any) => (
               <div key={p.dataKey} className="flex flex-col mt-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {p.name}
                </span>
                <span className="font-bold" style={{color: p.color}}>
                  {p.value.toLocaleString('pt-BR')} {chartView === 'engagementRate' ? '%' : ''}
                </span>
              </div>
            ))}
            {chartView === 'postAnalysis' && data.comments && (
                 <div className="flex flex-col mt-1">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      Comentários
                    </span>
                    <span className="font-bold" style={{color: 'var(--color-comments)'}}>
                        {data.comments.toLocaleString('pt-BR')}
                    </span>
                </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

   const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        if(payload.url) {
          window.open(payload.url, '_blank', 'noopener,noreferrer');
        }
    }
  };
  
  const renderChart = () => {
    switch (chartView) {
      case 'postAnalysis':
        return (
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="views" 
              name="Views" 
              tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} 
              domain={['dataMin', 'dataMax']}
            />
            <YAxis 
              type="number" 
              dataKey="likes" 
              name="Likes" 
              tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v}
              domain={['dataMin', 'dataMax']}
            />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Scatter 
              data={scatterData} 
              fill="hsl(var(--primary))" 
              className="cursor-pointer"
            />
             <Line
                dataKey="likes"
                data={trendlineData}
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                legendType="none"
              />
          </ScatterChart>
        );
      case 'engagementRate':
        return (
          <AreaChart data={postEngagementRateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="fillEng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-engagementRate)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-engagementRate)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}%`} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Area dataKey="engagementRate" type="monotone" fill="url(#fillEng)" stroke="var(--color-engagementRate)" name="Engajamento" />
          </AreaChart>
        );
      case 'topPosts':
         return (
            <BarChart data={topPostsData} layout="vertical" margin={{ left: 100, top: 5, right: 30, bottom: 5 }} onClick={handleChartClick}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="engagement" fill="var(--color-engagementRate)" name="Taxa de Engajamento" className="cursor-pointer">
                 <LabelList dataKey="engagement" position="right" offset={8} className="fill-foreground text-xs" formatter={(v: number) => `${v.toFixed(1)}%`} />
              </Bar>
            </BarChart>
          );
      case 'evolution':
      default:
        return (
          <LineChart data={postEvolutionData} >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} name="Views" dot={false} />
            <Line type="monotone" dataKey="likes" stroke="var(--color-likes)" strokeWidth={2} name="Likes" dot={false} />
            <Line type="monotone" dataKey="comments" stroke="var(--color-comments)" strokeWidth={2} name="Comentários" dot={false}/>
          </LineChart>
        );
    }
  };
  
  const hasData = useMemo(() => {
    if (chartView === 'postAnalysis') return scatterData.length > 0;
    if (chartView === 'topPosts') return topPostsData.length > 0;
    return postEvolutionData.length > 0;
  }, [chartView, postEvolutionData, topPostsData, scatterData]);

  return (
    <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center">Análise de Performance</CardTitle>
            <div className="flex justify-center pt-4">
                 <Tabs value={chartView} onValueChange={(value) => setChartView(value as any)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="evolution"><TrendingUp className="mr-2 h-4 w-4" /> Evolução</TabsTrigger>
                        <TabsTrigger value="engagementRate"><Percent className="mr-2 h-4 w-4" /> Engajamento</TabsTrigger>
                        <TabsTrigger value="topPosts"><BarChartHorizontal className="mr-2 h-4 w-4" /> Top Posts</TabsTrigger>
                        <TabsTrigger value="postAnalysis"><Activity className="mr-2 h-4 w-4" /> Análise de Posts</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent className="h-[450px] pl-2 pr-4">
            {isLoading ? <Skeleton className="h-full w-full" /> : 
            hasData ? (
                <ChartContainer config={chartConfigBase} className="h-full w-full">
                    <ResponsiveContainer>
                        {renderChart()}
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="h-full w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
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
}
