
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
     
     const posts = combined.map(p => {
        const captionOrDesc = 'caption' in p ? p.caption : p.description;
        const name = (!captionOrDesc || /^(Post|Video) \d+/.test(captionOrDesc))
            ? 'Sem título' 
            : captionOrDesc.substring(0, 25);

        if ('shortcode' in p) { // InstagramPostData
            const followerCount = parseMetric(userProfile?.instagramFollowers);
            const engagement = followerCount > 0 ? (p.likes + p.comments) / followerCount * 100 : 0;
            return {
                id: p.id,
                name: name,
                views: p.video_view_count ?? 0,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: `https://www.instagram.com/p/${p.shortcode}`,
                type: 'instagram' as const,
                post: p,
                date: 'fetchedAt' in p && p.fetchedAt ? p.fetchedAt.toDate() : new Date(0)
            }
        } else { // TikTokPost
             const followerCount = parseMetric(userProfile?.tiktokFollowers);
             const engagement = followerCount > 0 ? (p.likes + p.comments) / followerCount * 100 : 0;
             return {
                id: p.id,
                name: name,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: p.shareUrl,
                type: 'tiktok' as const,
                post: p,
                date: 'fetchedAt' in p && p.fetchedAt ? p.fetchedAt.toDate() : new Date(0)
            }
        }
     });

    // Sort posts chronologically and take the last 15
    return posts.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-15);

  }, [instaPosts, tiktokPosts, userProfile, selectedPlatform]);

  const topPostsData = useMemo(() => {
     return [...allPosts].filter(p => p.views > 0).sort((a,b) => b.views - a.views).slice(0, 5);
  }, [allPosts]);

  const historicalChartData = useMemo(() => {
    if (!metricSnapshots || metricSnapshots.length === 0) return [];

    if (selectedPlatform === 'total') {
        const groupedByDay = metricSnapshots.reduce((acc, snap) => {
            const dayStr = format(snap.date.toDate(), 'yyyy-MM-dd');
            if (!acc[dayStr]) {
                acc[dayStr] = { date: dayStr, followers: 0, views: 0, likes: 0, comments: 0, count: 0 };
            }
            acc[dayStr].followers += parseMetric(snap.followers);
            acc[dayStr].views += parseMetric(snap.views);
            acc[dayStr].likes += parseMetric(snap.likes);
            acc[dayStr].comments += parseMetric(snap.comments);
            acc[dayStr].count++;
            return acc;
        }, {} as Record<string, { date: string; followers: number; views: number; likes: number; comments: number; count: number }>);

        return Object.values(groupedByDay)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30)
            .map(dayData => ({
                date: format(new Date(`${dayData.date}T00:00:00`), 'dd/MM'),
                followers: dayData.followers,
                views: dayData.count > 1 ? dayData.views / dayData.count : dayData.views,
                likes: dayData.count > 1 ? dayData.likes / dayData.count : dayData.likes,
                comments: dayData.count > 1 ? dayData.comments / dayData.count : dayData.comments,
            }));
    }

    return metricSnapshots
        .filter(snap => snap.platform === selectedPlatform)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis())
        .slice(-30)
        .map(snap => ({
            date: format(snap.date.toDate(), 'dd/MM'),
            followers: parseMetric(snap.followers),
            views: parseMetric(snap.views),
            likes: parseMetric(snap.likes),
            comments: parseMetric(snap.comments),
        }));
  }, [metricSnapshots, selectedPlatform]);

  const engagementRateData = useMemo(() => {
    if (!historicalChartData || historicalChartData.length === 0) return [];
    return historicalChartData.map(d => {
        const rate = d.followers > 0 ? ((d.likes + d.comments) / d.followers) * 100 : 0;
        return {
            date: d.date,
            engagementRate: parseFloat(rate.toFixed(2)),
        }
    });
  }, [historicalChartData]);
  

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.name || label}
            </span>
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
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                          <p className="max-w-xs">Use as abas para analisar a evolução das suas métricas, seus top posts e sua taxa de engajamento.</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            </CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] pl-2 pr-4">
          <Tabs defaultValue="evolution" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-auto max-w-md">
                  <TabsTrigger value="evolution"><TrendingUp className="mr-2 h-4 w-4" /> Evolução</TabsTrigger>
                  <TabsTrigger value="topPosts"><BarChartHorizontal className="mr-2 h-4 w-4" /> Top Posts</TabsTrigger>
                  <TabsTrigger value="engagementRate"><Percent className="mr-2 h-4 w-4" /> Engajamento</TabsTrigger>
              </TabsList>
              <div className="flex-1 mt-4">
                <TabsContent value="evolution" className="h-full">
                   {isLoading ? <Skeleton className="h-full w-full" /> : 
                    allPosts.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="h-full w-full">
                          <ResponsiveContainer>
                            <LineChart data={allPosts} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{fontSize: 10, angle: -20, textAnchor: 'end'}} height={50} interval={0} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Legend />
                                <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} name="Views" dot={false} />
                                <Line type="monotone" dataKey="likes" stroke="var(--color-likes)" strokeWidth={2} name="Likes" dot={false} />
                                <Line type="monotone" dataKey="comments" stroke="var(--color-comments)" strokeWidth={2} name="Comentários" dot={false}/>
                            </LineChart>
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
                </TabsContent>
                <TabsContent value="topPosts" className="h-full">
                    {isLoading ? <Skeleton className="h-full w-full" /> : 
                    topPostsData.length > 0 ? (
                       <ChartContainer config={chartConfigBase} className="h-full w-full">
                         <ResponsiveContainer>
                            <BarChart data={topPostsData} layout="vertical" margin={{ left: 120, top: 5, right: 30, bottom: 5 }} onClick={handleChartClick}>
                              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                              <XAxis type="number" tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                              <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                              <Bar dataKey="views" fill="var(--color-views)" name="Views" className="cursor-pointer">
                                 <LabelList dataKey="views" position="right" offset={8} className="fill-foreground text-xs" formatter={(v: number) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                              </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                       </ChartContainer>
                    ) : (
                         <div className="h-full w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                           <div>
                            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                            <h3 className="font-semibold text-foreground">Não há posts com visualizações para analisar.</h3>
                            <p className="text-sm text-muted-foreground">Continue postando para ver os dados aqui.</p>
                           </div>
                         </div>
                    )}
                </TabsContent>
                <TabsContent value="engagementRate" className="h-full">
                   {isLoading ? <Skeleton className="h-full w-full" /> : 
                    engagementRateData.length > 0 ? (
                       <ChartContainer config={chartConfigBase} className="h-full w-full">
                         <ResponsiveContainer>
                            <AreaChart data={engagementRateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <defs>
                                <linearGradient id="fillEng" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-engagementRate)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-engagementRate)" stopOpacity={0}/>
                                </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}%`} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Area dataKey="engagementRate" type="monotone" fill="url(#fillEng)" stroke="var(--color-engagementRate)" name="Engajamento" />
                            </AreaChart>
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
                </TabsContent>
              </div>
          </Tabs>
        </CardContent>
    </Card>
  );
}
