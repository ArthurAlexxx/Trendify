
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Lightbulb, Info, AlertTriangle, Rocket, Clock, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DashboardInsightsOutput } from '@/app/(app)/dashboard/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PerformanceAnalysisCardProps {
    isGeneratingInsights: boolean;
    insights: DashboardInsightsOutput | null;
    handleGenerateInsights: () => void;
}

const InsightSection = ({ title, icon: Icon, items, iconClass }: { title: string; icon: React.ElementType; items?: string[]; iconClass?: string }) => {
    if (!items || items.length === 0) return null;
    return (
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Icon className={`h-4 w-4 ${iconClass}`} /> {title}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0"></div>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
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
                ) : insights ? (
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-6">
                            <InsightSection title="Principais Insights" icon={Lightbulb} items={insights.insights} iconClass="text-primary" />
                            <InsightSection title="Ações Recomendadas" icon={Rocket} items={insights.recommendedActions} iconClass="text-green-500" />
                            <InsightSection title="Pontos de Atenção" icon={AlertTriangle} items={insights.riskAlerts} iconClass="text-yellow-500" />
                            <InsightSection title="Oportunidades de Conteúdo" icon={Sparkles} items={insights.contentOpportunities} iconClass="text-purple-500" />
                            {insights.bestPostTime && (
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Melhor Horário para Postar</h4>
                                    <p className="text-sm text-muted-foreground">{insights.bestPostTime}</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4 gap-4">
                    <p className="text-sm text-muted-foreground">Clique em 'Analisar' para receber uma análise com base nas suas últimas métricas.</p>
                    <Button variant="ghost" size="sm" onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                        {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Analisar
                    </Button>
                </div>
                )}
            </CardContent>
        </Card>
    );
}
