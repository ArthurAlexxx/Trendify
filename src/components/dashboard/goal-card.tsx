
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, PartyPopper, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
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

const ConfettiParticle = () => {
    const colors = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomX = Math.random() * 100;
    const randomDuration = 2 + Math.random() * 2; // 2 to 4 seconds
    const randomDelay = Math.random() * 2;

    return (
        <motion.div
            className="absolute top-0 w-2 h-2 rounded-full"
            style={{
                left: `${randomX}%`,
                backgroundColor: randomColor,
            }}
            initial={{ y: '-10vh', opacity: 1 }}
            animate={{ y: '110vh', rotate: Math.random() * 360 }}
            transition={{ duration: randomDuration, repeat: Infinity, ease: "linear", delay: randomDelay }}
        />
    );
};


export function GoalCard({ isLoading, goalFollowers, currentFollowers, formatMetricValue, userProfile }: GoalCardProps) {
    const [showCongrats, setShowCongrats] = useState(false);
    
    const followerGoalProgress = goalFollowers > 0 ? Math.min((currentFollowers / goalFollowers) * 100, 100) : 0;
    const pieData = [{ value: followerGoalProgress, fill: 'hsl(var(--primary))' }, { value: 100 - followerGoalProgress, fill: 'hsl(var(--muted))' }];

    useEffect(() => {
        // Show congrats modal if the goal is met or exceeded.
        // It will automatically hide when a new, higher goal is set.
        if (!isLoading && goalFollowers > 0 && currentFollowers >= goalFollowers) {
            setShowCongrats(true);
        } else {
            // Ensure it's hidden if the goal changes and is no longer met.
            setShowCongrats(false);
        }
    }, [currentFollowers, goalFollowers, isLoading]);
    
    return (
        <>
         <AlertDialog open={showCongrats} onOpenChange={setShowCongrats}>
            <AlertDialogContent>
                <div className="absolute inset-0 overflow-hidden rounded-lg -z-10">
                    {Array.from({ length: 50 }).map((_, i) => <ConfettiParticle key={i} />)}
                </div>
                <AlertDialogHeader className="text-center items-center">
                    <div className="h-16 w-16 rounded-full bg-yellow-400/10 flex items-center justify-center mb-2 border-2 border-yellow-400/20">
                         <Trophy className="h-8 w-8 text-yellow-500 animate-pulse" />
                    </div>
                    <AlertDialogTitle className="font-headline text-2xl">Parabéns!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Você atingiu sua meta de {formatMetricValue(goalFollowers)} seguidores. É hora de definir o próximo objetivo!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <FollowerGoalSheet userProfile={userProfile}>
                       <Button className="w-full">
                         <PartyPopper className="mr-2 h-4 w-4" />
                         Definir Nova Meta
                       </Button>
                    </FollowerGoalSheet>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
                         <FollowerGoalSheet userProfile={userProfile}>
                            <Button variant="link" size="sm">Definir meta para começar</Button>
                        </FollowerGoalSheet>
                    )}
                </div>
            </CardContent>
        </Card>
      </>
    );
}
