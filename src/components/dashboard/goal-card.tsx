
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, PartyPopper, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FollowerGoalSheet } from './follower-goal-sheet';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

interface GoalCardProps {
    isLoading: boolean;
    goalFollowers: number;
    currentFollowers: number;
    formatMetricValue: (value?: string | number) => string;
    userProfile: any;
}


export function GoalCard({ isLoading, goalFollowers, currentFollowers, formatMetricValue, userProfile }: GoalCardProps) {
    const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);
    
    const followerGoalProgress = goalFollowers > 0 ? Math.min((currentFollowers / goalFollowers) * 100, 100) : 0;
    const isGoalReached = !isLoading && goalFollowers > 0 && currentFollowers >= goalFollowers;
    
    const pieData = [{ value: followerGoalProgress, fill: 'hsl(var(--primary))' }, { value: 100 - followerGoalProgress, fill: 'hsl(var(--muted))' }];

    // Effect to automatically open the goal sheet when a goal is reached
    useEffect(() => {
        if (isGoalReached) {
            setIsGoalSheetOpen(true);
        }
    }, [isGoalReached]);
    
    return (
        <>
        <FollowerGoalSheet 
            userProfile={userProfile} 
            isOpen={isGoalSheetOpen} 
            setIsOpen={setIsGoalSheetOpen}
            isGoalReached={isGoalReached}
        >
            {/* The trigger is outside, so we pass a dummy span here */}
            <span /> 
        </FollowerGoalSheet>


        <Card className="h-full shadow-primary-lg">
            <CardHeader>
                <CardTitle className="text-center font-headline text-xl">Meta de Seguidores</CardTitle>
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
                        <Button variant="link" size="sm" onClick={() => setIsGoalSheetOpen(true)}>
                            Definir meta para começar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
      </>
    );
}
