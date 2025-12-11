
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Heart, MessageSquare, Smile, Meh, Frown, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EngagementMetricsCardProps {
    isLoading: boolean;
    latestMetrics: {
        followers: number;
        views: number;
        likes: number;
        comments: number;
        engagementRate: number;
    } | null;
    formatIntegerValue: (value?: string | number) => string;
}

export default function EngagementMetricsCard({ isLoading, latestMetrics, formatIntegerValue }: EngagementMetricsCardProps) {
    
    return (
        <Card className="shadow-primary-lg">
        <CardHeader>
            <CardTitle className="text-center font-headline text-lg">Métricas de Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Eye className="h-4 w-4" /> Média de Views</h3>
                        <div className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatIntegerValue(latestMetrics?.views)}</div>
                    </div>
                </div>
                <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Heart className="h-4 w-4" /> Média de Likes</h3>
                        <div className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : formatIntegerValue(latestMetrics?.likes)}</div>
                    </div>
                </div>
                 <div className='p-4 rounded-lg bg-muted/50 border flex justify-between items-center'>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center justify-start gap-2"><Percent className="h-4 w-4" /> Taxa de Engajamento</h3>
                        <div className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-7 w-16" /> : `${latestMetrics?.engagementRate.toFixed(2) || '0.00'}%`}</div>
                    </div>
                </div>
            </div>
        </CardContent>
        </Card>
    );
}
