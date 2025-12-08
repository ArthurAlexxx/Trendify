
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend, LineChart, Line, LabelList, Area, AreaChart } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, Percent, BarChartHorizontal, ClipboardList } from 'lucide-react';
import type { MetricSnapshot, InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';

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
  const [chartView, setChartView] = useState<'evolution' | 'engagementRate' | 'topPosts'>('evolution');

  const parseMetric = (value?: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
    return isNaN(num) ? 0 : num;
  };

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
                views: dayData.count > 0 ? dayData.views / dayData.count : 0,
                likes: dayData.count > 0 ? dayData.likes / dayData.count : 0,
                comments: dayData.count > 0 ? dayData.comments / dayData.count : 0,
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

  const topPostsData = useMemo(() => {
     const allPosts: (InstagramPostData | TikTokPost)[] = [
        ...(instaPosts || []),
        ...(tiktokPosts || [])
     ];
     
     const mappedPosts = allPosts.map(p => {
        if ('shortcode' in p) { // InstagramPostData
            return {
                id: p.id,
                name: p.caption?.substring(0, 25) || `Post ${p.id.substring(0, 4)}`,
                views: p.video_view_count ?? 0,
                url: `https://www.instagram.com/p/${p.shortcode}`,
                type: 'instagram' as const,
                post: p,
            }
        } else { // TikTokPost
             return {
                id: p.id,
                name: p.description?.substring(0, 25) || `Video ${p.id.substring(0, 4)}`,
                views: p.views,
                url: p.shareUrl,
                type: 'tiktok' as const,
                post: p,
            }
        }
     });

     return mappedPosts.filter(p => p.views > 0).sort((a,b) => b.views - a.views).slice(0, 5);
  }, [instaPosts, tiktokPosts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {chartView === 'topPosts' ? 'Post' : 'Data'}
              </span>
              <span className="font-bold text-muted-foreground">
                {label}
              </span>
            </div>
            {payload.map((p: any) => (
               <div key={p.dataKey} className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {p.name}
                </span>
                <span className="font-bold" style={{color: p.color}}>
                  {p.value.toLocaleString('pt-BR')} {chartView === 'engagementRate' ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

   const CustomBar = (props: any) => {
    const { fill, x, y, width, height, payload } = props;
    const url = payload.url;
    const type = payload.type;
    const post = payload.post;
    
    const content = (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} radius={[0, 4, 4, 0]} className="cursor-pointer transition-opacity hover:opacity-80" />
        </g>
    );

    if (type === 'tiktok' && onTikTokClick) {
        return <g onClick={() => handleTikTokClick(post)}>{content}</g>;
    }
    
    return (
        <Link href={url || '#'} target="_blank" rel="noopener noreferrer">
            {content}
        </Link>
    );
};
  
  const renderChart = () => {
    switch (chartView) {
      case 'engagementRate':
        return (
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
        );
      case 'topPosts':
         return (
            <BarChart data={topPostsData} layout="vertical" margin={{ left: 100, top: 5, right: 30, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="views" fill="var(--color-views)" name="Views" shape={<CustomBar />}>
                 <LabelList dataKey="views" position="right" offset={8} className="fill-foreground text-xs" formatter={(v: number) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
              </Bar>
            </BarChart>
          );
      case 'evolution':
      default:
        return (
          <LineChart data={historicalChartData} >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${v/1000}k` : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Line type="monotone" dataKey="followers" stroke="var(--color-followers)" strokeWidth={2} name="Seguidores" dot={false} />
            <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} name="Views" dot={false} />
            <Line type="monotone" dataKey="likes" stroke="var(--color-likes)" strokeWidth={2} name="Likes" dot={false} />
            <Line type="monotone" dataKey="comments" stroke="var(--color-comments)" strokeWidth={2} name="Comentários" dot={false}/>
          </LineChart>
        );
    }
  };

  return (
    <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center">Análise de Performance</CardTitle>
            <div className="flex justify-center pt-4">
                 <Tabs value={chartView} onValueChange={(value) => setChartView(value as any)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="evolution"><TrendingUp className="mr-2 h-4 w-4" /> Evolução</TabsTrigger>
                        <TabsTrigger value="engagementRate"><Percent className="mr-2 h-4 w-4" /> Taxa de Engajamento</TabsTrigger>
                        <TabsTrigger value="topPosts"><BarChartHorizontal className="mr-2 h-4 w-4" /> Top Posts</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent className="pl-2 pr-6">
            {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
            (historicalChartData.length > 0 || (chartView === 'topPosts' && topPostsData.length > 0)) ? (
                <ChartContainer config={chartConfigBase} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    {renderChart()}
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
        </CardContent>
    </Card>
  );
}
