
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Lightbulb, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DashboardInsightsOutput } from '@/app/(app)/dashboard/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PerformanceAnalysisCardProps {
    isGeneratingInsights: boolean;
    insights: DashboardInsightsOutput | null;
    handleGenerateInsights: () => void;
}

export default function PerformanceAnalysisCard({ isGeneratingInsights, insights, handleGenerateInsights }: PerformanceAnalysisCardProps) {
    return (
        <Card className="h-full flex flex-col shadow-primary-lg">
            <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                    Análise de Desempenho (IA)
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Receba insights gerados por IA com base em suas métricas recentes.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {isGeneratingInsights ? (
                    <div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : insights && insights.insights ? (
                    <ScrollArea className="h-64 pr-4">
                    <ul className="space-y-4">
                        {insights.insights.map((insight: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5"><Lightbulb className="h-3.5 w-3.5" /></div>
                            <p className="text-sm text-muted-foreground">{insight}</p>
                        </li>
                        ))}
                    </ul >
                    </ScrollArea>
                ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4 gap-4">
                    <p className="text-sm text-muted-foreground">Clique em 'Analisar' para receber uma análise com base nas suas últimas métricas.</p>
                    <Button variant="ghost" size="sm" onClick={handleGenerateInsights} disabled={true}>
                        {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Analisar
                    </Button>
                </div>
                )}
            </CardContent>
        </Card>
    );
}
