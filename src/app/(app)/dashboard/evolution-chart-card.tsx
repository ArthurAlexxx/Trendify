
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, Area, AreaChart, Label } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { TrendingUp, Percent, BarChartHorizontal, ClipboardList, Info, Camera, Video, PlayCircle, Eye, Heart, MessageSquare } from 'lucide-react';
import type { MetricSnapshot, InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const chartConfigBase: ChartConfig = {
  views: { label: "Views", color: "hsl(var(--chart-2))"  },
  likes: { label: "Likes", color: "hsl(var(--chart-1))"  },
  comments: { label: "Comentários", color: "hsl(var(--chart-4))"  },
  engagement: { label: "Engajamento (%)", color: "hsl(var(--primary))" },
};

interface PostData {
    id: string;
    name: string;
    postLabel: string;
    views: number;
    likes: number;
    comments: number;
    engagement: number;
    url: string;
    mediaUrl: string;
    coverUrl?: string;
    date: Date;
    isVideo: boolean;
}

interface EvolutionChartCardProps {
    isLoading: boolean;
    metricSnapshots: MetricSnapshot[] | null;
    instaPosts: InstagramPostData[] | null;
    tiktokPosts: TikTokPost[] | null;
    selectedPlatform: 'total' | 'instagram' | 'tiktok';
    userProfile: UserProfile | null;
    onItemClick: (item: any) => void;
}

const formatIntegerValue = (value?: string | number): string => {
    const parseMetric = (val?: string | number): number => {
        if (typeof val === 'number') return val;
        if (!val || typeof val !== 'string') return 0;
        const cleanedValue = val.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
        return isNaN(num) ? 0 : num;
    }
    const num = parseMetric(value);
    return Math.round(num).toLocaleString('pt-BR');
};

export default function EvolutionChartCard({ isLoading, metricSnapshots, instaPosts, tiktokPosts, selectedPlatform, userProfile, onItemClick }: EvolutionChartCardProps) {

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
     
     const posts: PostData[] = combined.map((p, index) => {
        const captionOrDesc = 'caption' in p ? p.caption : p.description;
        const name = (!captionOrDesc || /^(Post|Video) \d+/.test(captionOrDesc))
            ? `Post sem título ${index + 1}`
            : captionOrDesc;

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
                postLabel: `Post ${index + 1}`,
                views: p.video_view_count ?? 0,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: `https://www.instagram.com/p/${p.shortcode}`,
                mediaUrl: p.mediaUrl,
                date: date,
                isVideo: p.is_video,
            }
        } else { // TikTokPost
             const followerCount = parseMetric(userProfile?.tiktokFollowers);
             const engagement = followerCount > 0 ? (p.likes + p.comments) / followerCount * 100 : 0;
             return {
                id: p.id,
                name: name,
                postLabel: `Post ${index + 1}`,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                engagement: parseFloat(engagement.toFixed(2)),
                url: p.shareUrl,
                mediaUrl: p.coverUrl, // Use coverUrl for TikTok
                coverUrl: p.coverUrl,
                date: date,
                isVideo: true,
            }
        }
     });

    return posts.sort((a, b) => b.date.getTime() - a.date.getTime());

  }, [instaPosts, tiktokPosts, userProfile, selectedPlatform]);
  
  const videoPosts = useMemo(() => allPosts.filter(p => p.isVideo), [allPosts]);
  const photoPosts = useMemo(() => allPosts.filter(p => !p.isVideo), [allPosts]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px] max-w-xs">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-foreground truncate mb-2">
              {data.name}
            </p>
             {payload.map((p: any) => (
               <div key={p.dataKey} className="flex items-center justify-between mt-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: p.color}}></div>
                    {p.name}
                </span>
                <span className="font-bold ml-4">
                  {p.value.toLocaleString('pt-BR')}{p.dataKey === 'engagement' ? '%' : ''}
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
        const payload = data.activePayload[0].payload;
        if (payload) {
            onItemClick(payload);
        }
    }
  };

  const renderPostGrid = (posts: PostData[], title: string, icon: React.ElementType) => {
      const Icon = icon;
      
      const PostItem = ({ post }: { post: PostData }) => (
        <Link href={post.url} target="_blank" rel="noopener noreferrer" className="group block">
            <Card className="overflow-hidden cursor-pointer relative">
                <div className="aspect-[9/16] bg-muted">
                    <Image src={post.coverUrl || post.mediaUrl} alt={post.name} fill style={{ objectFit: 'cover' }} className="group-hover:scale-105 transition-transform duration-300" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="h-10 w-10 text-white" />
                     </div>
                </div>
            </Card>
            <div className="mt-2 text-center text-xs text-muted-foreground grid grid-cols-3 gap-1">
                <div className="flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{formatIntegerValue(post.views)}</span>
                </div>
                 <div className="flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{formatIntegerValue(post.likes)}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{formatIntegerValue(post.comments)}</span>
                </div>
            </div>
        </Link>
      );

      return (
        <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </h3>
            {isLoading ? <Skeleton className="h-[150px] w-full" /> : 
            posts.length > 0 ? (
                posts.length > 5 ? (
                    <Carousel className="w-full" opts={{ align: "start" }}>
                        <CarouselContent className="-ml-3">
                            {posts.map(post => (
                                <CarouselItem key={post.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                                    <PostItem post={post} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-[-8px]"/>
                        <CarouselNext className="right-[-8px]"/>
                    </Carousel>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {posts.map(post => <PostItem key={post.id} post={post} />)}
                    </div>
                )
            ) : (
                <div className="h-[150px] w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                    <div>
                        <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                        <h3 className="font-semibold text-foreground">Nenhum post encontrado.</h3>
                    </div>
                </div>
            )}
        </div>
      )
  }
  
  return (
    <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              Performance de Posts
            </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="evolution" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-auto max-w-md">
                  <TabsTrigger value="evolution">Evolução</TabsTrigger>
                  <TabsTrigger value="posts">Seus Posts</TabsTrigger>
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
                          <p className="max-w-xs">Acompanhe a evolução de views, likes e comentários dos seus últimos posts.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                   {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
                    (selectedPlatform === 'total') ? (
                       <div className="h-[350px] w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                          <div>
                            <BarChartHorizontal className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                            <h3 className="font-semibold text-foreground">Análise por Plataforma</h3>
                            <p className="text-sm text-muted-foreground">Selecione Instagram ou TikTok para ver o gráfico de evolução.</p>
                          </div>
                        </div>
                    ) :
                    allPosts.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="h-[350px] w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={allPosts.slice(0, 15).reverse()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleChartClick} className="cursor-pointer">
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.1}/></linearGradient>
                                    <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-likes)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-likes)" stopOpacity={0.1}/></linearGradient>
                                    <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-comments)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--color-comments)" stopOpacity={0.1}/></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="postLabel" tick={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="url(#colorViews)" stackId="a" name="Views" />
                                <Area type="monotone" dataKey="likes" stroke="var(--color-likes)" fill="url(#colorLikes)" stackId="b" name="Likes" />
                                <Area type="monotone" dataKey="comments" stroke="var(--color-comments)" fill="url(#colorComments)" stackId="b" name="Comentários" />
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
                <TabsContent value="posts" className="space-y-8">
                     {renderPostGrid(videoPosts, "Últimos Vídeos", Video)}
                     {renderPostGrid(photoPosts, "Últimas Fotos", Camera)}
                </TabsContent>
              </div>
          </Tabs>
        </CardContent>
    </Card>
  );
}

    