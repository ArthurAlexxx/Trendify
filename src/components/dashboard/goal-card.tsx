
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, Trophy, Info } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface GoalCardProps {
    isLoading: boolean;
    goalFollowers: number;
    currentFollowers: number;
    isGoalReached: boolean;
    onEditGoal: () => void;
    formatMetricValue: (value?: string | number) => string;
}

export default function GoalCard({ isLoading, goalFollowers, currentFollowers, isGoalReached, onEditGoal, formatMetricValue }: GoalCardProps) {
    
    useEffect(() => {
        if (isGoalReached) {
            onEditGoal();
        }
    }, [isGoalReached, onEditGoal]);
    
    const followerGoalProgress = goalFollowers > 0 ? Math.min((currentFollowers / goalFollowers) * 100, 100) : 0;
    const pieData = [{ value: followerGoalProgress, fill: 'hsl(var(--primary))' }, { value: 100 - followerGoalProgress, fill: 'hsl(var(--muted))' }];

    return (
        <Card className="h-full shadow-primary-lg">
            <CardHeader>
                <CardTitle className="text-center font-headline text-lg flex items-center justify-center gap-2">
                    Meta de Seguidores
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center">
                    {isLoading ? (
                        <Skeleton className="h-48 w-48 rounded-full" />
                    ) : goalFollowers > 0 ? (
                        <div className="relative h-48 w-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                        innerRadius="80%"
                                        outerRadius="100%"
                                        cornerRadius={50}
                                        paddingAngle={0}
                                        stroke="none"
                                    >
                                        {pieData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold font-headline text-primary">
                                    {followerGoalProgress.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 w-48 rounded-full border-4 border-dashed bg-muted">
                            <Target className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                    <p className="text-3xl font-bold font-headline mt-4">
                        {formatMetricValue(currentFollowers)}
                    </p>
                    {goalFollowers > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            de {formatMetricValue(goalFollowers)} seguidores
                        </p>
                    ) : (
                        <Button variant="link" size="sm" onClick={onEditGoal}>
                            Definir meta para começar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
