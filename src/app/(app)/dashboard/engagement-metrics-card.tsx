
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Heart, MessageSquare, Smile, Meh, Frown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EngagementMetricsCardProps {
    isLoading: boolean;
    latestMetrics: {
        followers: number;
        views: number;
        likes: number;
        comments: number;
    } | null;
    formatIntegerValue: (value?: string | number) => string;
}

export default function EngagementMetricsCard({ isLoading, latestMetrics, formatIntegerValue }: EngagementMetricsCardProps) {
    
    const getMetricRating = (value: number, type: 'views' | 'likes' | 'comments', followers: number): { iconName: 'Smile' | 'Meh' | 'Frown', color: string } => {
        if (followers === 0) {
            return { iconName: 'Meh', color: 'text-yellow-500' };
        }

        const ratio = value / followers;
        
        const thresholds = {
            views: { good: 0.25, medium: 0.05 },    // 25% = bom, 5% = médio
            likes: { good: 0.03, medium: 0.01 },    // 3% = bom, 1% = médio
            comments: { good: 0.005, medium: 0.001 } // 0.5% = bom, 0.1% = médio
        };

        if (ratio >= thresholds[type].good) {
        return { iconName: 'Smile', color: 'text-green-500' };
        }
        if (ratio >= thresholds[type].medium) {
        return { iconName: 'Meh', color: 'text-yellow-500' };
        }
        return { iconName: 'Frown', color: 'text-red-500' };
    };
    
    return (
        <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center text-lg">Métricas de Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Eye className="h-4 w-4" /> Média de Views</h3>
                        <div className="text-2xl font-bold font-body">{isLoading ? <Skeleton className="h-7 w-16" /> : formatIntegerValue(latestMetrics?.views)}</div>
                    </div>
                    <div>
                        {latestMetrics?.views !== undefined && latestMetrics.followers > 0 && (() => {
                                const rating = getMetricRating(latestMetrics.views, 'views', latestMetrics.followers);
                                const Icon = rating.iconName === 'Smile' ? Smile : rating.iconName === 'Meh' ? Meh : Frown;
                                return (
                                <div className={cn('h-7 w-7', rating.color)}>
                                    <Icon className="h-full w-full" />
                                </div>
                                )
                            })()}
                    </div>
                </div>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Heart className="h-4 w-4" /> Média de Likes</h3>
                        <div className="text-2xl font-bold font-body">{isLoading ? <Skeleton className="h-7 w-16" /> : formatIntegerValue(latestMetrics?.likes)}</div>
                    </div>
                        <div>
                        {latestMetrics?.likes !== undefined && latestMetrics.followers > 0 && (() => {
                            const rating = getMetricRating(latestMetrics.likes, 'likes', latestMetrics.followers);
                            const Icon = rating.iconName === 'Smile' ? Smile : rating.iconName === 'Meh' ? Meh : Frown;
                            return (
                            <div className={cn('h-7 w-7', rating.color)}>
                                <Icon className="h-full w-full" />
                            </div>
                            )
                        })()}
                    </div>
                </div>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><MessageSquare className="h-4 w-4" /> Média de Comentários</h3>
                        <div className="text-2xl font-bold font-body">{isLoading ? <Skeleton className="h-7 w-16" /> : formatIntegerValue(latestMetrics?.comments)}</div>
                    </div>
                        <div>
                        {latestMetrics?.comments !== undefined && latestMetrics.followers > 0 && (() => {
                            const rating = getMetricRating(latestMetrics.comments, 'comments', latestMetrics.followers);
                            const Icon = rating.iconName === 'Smile' ? Smile : rating.iconName === 'Meh' ? Meh : Frown;
                            return (
                            <div className={cn('h-7 w-7', rating.color)}>
                                <Icon className="h-full w-full" />
                            </div>
                            )
                        })()}
                    </div>
                </div>
            </div>
        </CardContent>
        </Card>
    );
}
