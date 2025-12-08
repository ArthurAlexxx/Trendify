
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, LabelList, Area, AreaChart } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, Percent, BarChartHorizontal, ClipboardList, Info } from 'lucide-react';
import type { MetricSnapshot, InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const chartConfigBase: ChartConfig = {
  followers: { label: "Seguidores", color: "hsl(var(--chart-1))" },
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
     
     const posts = combined.map((p, index) => {
        const captionOrDesc = 'caption' in p ? p.caption : p.description;
        const name = (!captionOrDesc || /^(Post|Video) \d+/.test(captionOrDesc))
            ? `Post sem título ${index + 1}`
            : captionOrDesc; // Full name for tooltip

        const date = ('createdAt' in p && p.createdAt && typeof (p.createdAt as any).toDate === 'function')
            ? (p.createdAt as any).toDate()
            : ('fetchedAt' in p && p.fetchedAt && typeof (p.fetchedAt as any).toDate === 'function')
            ? (p.fetchedAt as any).toDate()
            : new Date(0);

        if ('shortcode' in p) { // InstagramPostData
            const followerCount = parseMetric(userProfile?.instagramFollowers);
            const engagement = followerCount > 0 ? (p.likes + p.comments) / followerCount * 100 : 0;
            return {
                id: p.id,
                name: name,
                shortName: name === 'Sem título' ? name : name.substring(0, 25) + (name.length > 25 ? '...' : ''),
                postLabel: `Post ${index + 1}`,
                views: p.video_view_count ?? 0,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: `https://www.instagram.com/p/${p.shortcode}`,
                type: 'instagram' as const,
                post: p,
                date: date
            }
        } else { // TikTokPost
             const followerCount = parseMetric(userProfile?.tiktokFollowers);
             const engagement = followerCount > 0 ? (p.likes + p.comments) / followerCount * 100 : 0;
             return {
                id: p.id,
                name: name,
                shortName: name === 'Sem título' ? name : name.substring(0, 25) + (name.length > 25 ? '...' : ''),
                postLabel: `Post ${index + 1}`,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: p.shareUrl,
                type: 'tiktok' as const,
                post: p,
                date: date
            }
        }
     });

    // Sort posts chronologically and take the last 15
    return posts.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-15);

  }, [instaPosts, tiktokPosts, userProfile, selectedPlatform]);

  const engagementRateData = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    return allPosts.map(d => {
        return {
            name: d.name,
            postLabel: d.postLabel,
            engagementRate: d.engagement,
            url: d.url,
        }
    });
  }, [allPosts]);
  
  const evolutionChartData = useMemo(() => {
    return allPosts.map(p => ({
        ...p,
    }));
  }, [allPosts]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px] max-w-xs">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-foreground truncate">
              {data.name}
            </p>
             {payload.map((p: any) => (
               <div key={p.dataKey} className="flex items-center justify-between mt-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: p.color}}></div>
                    {p.name}
                </span>
                <span className="font-bold ml-4">
                  {p.value.toLocaleString('pt-BR')}{p.dataKey === 'engagementRate' ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

   const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
        const url = data.activePayload[0].payload?.url;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }
  };
  
  return (
    <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              Análise de Performance
            </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="evolution" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-auto max-w-md">
                  <TabsTrigger value="evolution">Evolução</TabsTrigger>
                  <TabsTrigger value="engagementRate">Engajamento</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                <TabsContent value="evolution" className="flex flex-col">
                   <div className="flex justify-end pr-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Acompanhe a evolução da performance (views, likes, comentários) de cada um dos seus últimos posts.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                   {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
                    evolutionChartData.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="h-[350px] w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleChartClick} className="cursor-pointer">
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.1}/></linearGradient>
                                    <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-likes)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-likes)" stopOpacity={0.1}/></linearGradient>
                                    <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-comments)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-comments)" stopOpacity={0.1}/></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="postLabel" tick={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Legend />
                                <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="url(#colorViews)" stackId="1" name="Views" />
                                <Area type="monotone" dataKey="likes" stroke="var(--color-likes)" fill="url(#colorLikes)" stackId="1" name="Likes" />
                                <Area type="monotone" dataKey="comments" stroke="var(--color-comments)" fill="url(#colorComments)" stackId="1" name="Comentários" />
                            </AreaChart>
                          </ResponsiveContainer>
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
                </TabsContent>
                <TabsContent value="engagementRate" className="flex flex-col">
                    <div className="flex justify-end pr-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent>
                                <p className="max-w-xs">Analise a taxa de engajamento (curtidas + comentários / seguidores) de cada post.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                   {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
                    engagementRateData.length > 0 ? (
                       <ChartContainer config={chartConfigBase} className="h-[350px] w-full flex-1">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementRateData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleChartClick} className="cursor-pointer">
                                <defs>
                                <linearGradient id="fillEng" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-engagementRate)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-engagementRate)" stopOpacity={0.1}/>
                                </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="postLabel" tick={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}%`} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Area dataKey="engagementRate" type="monotone" fill="url(#fillEng)" stroke="var(--color-engagementRate)" name="Engajamento" />
                            </AreaChart>
                         </ResponsiveContainer>
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
                </TabsContent>
              </div>
          </Tabs>
        </CardContent>
    </Card>
  );
}

