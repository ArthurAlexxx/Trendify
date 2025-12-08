
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, ClipboardList, Info } from 'lucide-react';
import type { InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const chartConfigBase: ChartConfig = {
  views: { label: "Views", color: "hsl(var(--chart-2))"  },
  likes: { label: "Likes", color: "hsl(var(--chart-3))"  },
};

interface EvolutionChartCardProps {
    isLoading: boolean;
    instaPosts: InstagramPostData[] | null;
    tiktokPosts: TikTokPost[] | null;
    selectedPlatform: 'total' | 'instagram' | 'tiktok';
    userProfile: UserProfile | null;
}

export default function EvolutionChartCard({ isLoading, instaPosts, tiktokPosts, selectedPlatform, userProfile }: EvolutionChartCardProps) {
  
  const allPosts = useMemo(() => {
     let combined: (InstagramPostData | TikTokPost)[] = [];
     if(selectedPlatform === 'instagram') {
        combined = [...(instaPosts || [])];
     } else if (selectedPlatform === 'tiktok') {
        combined = [...(tiktokPosts || [])];
     } else {
        combined = [...(instaPosts || []), ...(tiktokPosts || [])];
     }
     
     const sorted = combined.sort((a, b) => {
        const dateA = (a as any).fetchedAt?.toMillis() || 0;
        const dateB = (b as any).fetchedAt?.toMillis() || 0;
        return dateA - dateB;
     });

     return sorted.map(p => {
        if ('shortcode' in p) { // InstagramPostData
            return {
                id: p.id,
                name: p.caption?.substring(0, 25) || `Post ${p.id.substring(0, 4)}`,
                views: p.video_view_count ?? 0,
                likes: p.likes,
                comments: p.comments,
                url: `https://www.instagram.com/p/${p.shortcode}`,
                type: 'instagram' as const,
            }
        } else { // TikTokPost
             return {
                id: p.id,
                name: p.description?.substring(0, 25) || `Video ${p.id.substring(0, 4)}`,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                url: p.shareUrl,
                type: 'tiktok' as const,
            }
        }
     });
  }, [instaPosts, tiktokPosts, selectedPlatform]);

  const postEvolutionData = useMemo(() => {
    return allPosts.slice(-15).map((p, index) => ({
      name: `Post ${index + 1}`,
      tooltipName: p.name,
      views: p.views,
      likes: p.likes,
    }));
  }, [allPosts]);


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
               <div key={p.dataKey} className="flex items-center justify-between mt-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: p.color}}></div>
                    {p.name}
                </span>
                <span className="font-bold ml-4">
                  {p.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  const hasData = postEvolutionData.length > 0;

  return (
    <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
                Evolução por Post
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">Acompanhe a evolução de views e likes dos seus últimos posts em ordem cronológica.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] pl-2 pr-4">
            {isLoading ? <Skeleton className="h-full w-full" /> : 
            hasData ? (
                <ChartContainer config={chartConfigBase} className="h-full w-full">
                    <ResponsiveContainer>
                       <LineChart data={postEvolutionData} >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Line type="monotone" dataKey="views" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Views" dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                            <Line type="monotone" dataKey="likes" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Likes" dot={{ r: 4 }} activeDot={{ r: 6 }}/>
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
        </CardContent>
    </Card>
  );
}
