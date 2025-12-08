
'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ZAxis } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, Link, ClipboardList, AlertCircle } from 'lucide-react';
import type { InstagramPostData, TikTokPost, UserProfile } from '@/lib/types';
import { format } from 'date-fns';

const chartConfigBase: ChartConfig = {
  likes: { label: "Likes", color: "hsl(var(--chart-3))" },
  comments: { label: "Comentários", color: "hsl(var(--chart-4))" },
};

interface CorrelationChartCardProps {
    isLoading: boolean;
    instaPosts: InstagramPostData[] | null;
    tiktokPosts: TikTokPost[] | null;
    selectedPlatform: 'total' | 'instagram' | 'tiktok';
    userProfile: UserProfile | null;
}

export default function CorrelationChartCard({ isLoading, instaPosts, tiktokPosts, selectedPlatform, userProfile }: CorrelationChartCardProps) {
  const [chartView, setChartView] = useState<'likes' | 'comments'>('likes');

  const correlationData = useMemo(() => {
    let posts: (InstagramPostData | TikTokPost)[] = [];

    if (selectedPlatform === 'instagram' || selectedPlatform === 'total') {
      posts = posts.concat(instaPosts || []);
    }
    if (selectedPlatform === 'tiktok' || selectedPlatform === 'total') {
      posts = posts.concat(tiktokPosts || []);
    }

    return posts.map(p => {
      if ('shortcode' in p) { // Instagram
        return {
          views: p.video_view_count ?? 0,
          likes: p.likes,
          comments: p.comments,
          name: p.caption?.substring(0, 30) || 'Post sem legenda',
        };
      } else { // TikTok
        return {
          views: p.views,
          likes: p.likes,
          comments: p.comments,
          name: p.description?.substring(0, 30) || 'Vídeo sem descrição',
        };
      }
    }).filter(p => p.views > 0); // Only include posts with views
  }, [instaPosts, tiktokPosts, selectedPlatform]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm max-w-xs">
          <p className="font-bold text-foreground text-sm truncate">{data.name}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
            <div className="text-muted-foreground">Views:</div>
            <div className="font-semibold text-right">{data.views.toLocaleString('pt-BR')}</div>
            <div className="text-muted-foreground">Likes:</div>
            <div className="font-semibold text-right">{data.likes.toLocaleString('pt-BR')}</div>
            <div className="text-muted-foreground">Comentários:</div>
            <div className="font-semibold text-right">{data.comments.toLocaleString('pt-BR')}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => (
    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        type="number"
        dataKey="views"
        name="Views"
        unit=""
        tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
        domain={['dataMin', 'dataMax']}
      />
      <YAxis
        type="number"
        dataKey={chartView}
        name={chartView === 'likes' ? 'Likes' : 'Comentários'}
        unit=""
        tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
      />
      <ZAxis type="number" range={[50, 500]} />
      <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
      <Scatter
        name="Posts"
        data={correlationData}
        fill={chartView === 'likes' ? "hsl(var(--chart-3))" : "hsl(var(--chart-4))"}
        shape="circle"
      />
    </ScatterChart>
  );

  return (
    <Card className="shadow-primary-lg">
      <CardHeader>
        <CardTitle className="text-center">Análise de Correlação</CardTitle>
        <CardDescription className="text-center">Encontre posts fora da curva.</CardDescription>
         <div className="flex justify-center pt-4">
                 <Tabs value={chartView} onValueChange={(value) => setChartView(value as any)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="likes">Views vs. Likes</TabsTrigger>
                        <TabsTrigger value="comments">Views vs. Comentários</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
      </CardHeader>
      <CardContent className="pl-2 pr-6">
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : correlationData.length > 0 ? (
          <ChartContainer config={chartConfigBase} className="h-[350px] w-full">
            <ResponsiveContainer>
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[350px] w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
            <div>
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground">Dados de Posts Insuficientes</h3>
              <p className="text-sm text-muted-foreground">Sincronize seus posts para ver esta análise.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
