
'use client';
import {
  Camera,
  Check,
  Clock,
  Disc,
  Heart,
  Mic,
  Pen,
  TrendingUp,
  AlertTriangle,
  LightbulbIcon,
  Youtube,
  Instagram,
  Clapperboard as TikTokIcon,
} from 'lucide-react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;


function InfoCard({
  title,
  icon: Icon,
  content,
  className,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn("p-4 rounded-lg bg-muted/50 border", className)}
    >
        <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </h4>
          <p className="font-semibold text-foreground">
            {content}
          </p>
    </div>
  );
}


export function VideoIdeasResultView({ result, formValues, isSheetView = false }: { result: any, formValues: FormSchemaType, isSheetView?: boolean }) {
    if (!result) return null;

    return (
        <div className={cn("space-y-8 animate-fade-in", isSheetView ? "p-6" : "")}>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-primary-lg">
                        <CardHeader>
                            <CardTitle className="text-center flex items-center gap-3 text-lg font-semibold text-foreground">
                                <Pen className="h-5 w-5 text-primary" />
                                <span>Roteiro do Vídeo</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible defaultValue='item-1' className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Roteiro Longo (45-60s)</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground whitespace-pre-wrap">{result.script.scriptLongo}</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Roteiro Curto (15-25s)</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground whitespace-pre-wrap">{result.script.scriptCurto}</AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card className="shadow-primary-lg">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-primary" />Análise de Concorrência</CardTitle></CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {result.nicheCompetitors.map((item: any, index: number) => (
                                    <AccordionItem value={`comp-${index}`} key={index}>
                                        <AccordionTrigger className='text-left'>{item.videoTitle}</AccordionTrigger>
                                        <AccordionContent>
                                            <p className="font-semibold text-foreground mb-1">O que aprender:</p>
                                            <p className="text-sm text-muted-foreground">{item.learning}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                    <Card className="shadow-primary-lg">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-primary" />Potencial de Viralização</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="text-5xl font-bold font-headline">{result.viralScore}</p>
                                <p className="text-sm text-muted-foreground">de 100</p>
                            </div>
                            <Progress value={result.viralScore} />
                        </CardContent>
                    </Card>

                    <div className='space-y-2'>
                        <InfoCard title="Gancho" icon={Mic} content={result.script.gancho} />
                        <InfoCard title="CTA" icon={Heart} content={result.script.cta} />
                        <InfoCard title="Horário Sugerido" icon={Clock} content={result.suggestedPostTime} />
                        <InfoCard title="Música em Alta" icon={Disc} content={result.trendingSong} />
                    </div>

                    {result.platformAdaptations && (result.platformAdaptations.tiktok || result.platformAdaptations.reels || result.platformAdaptations.shorts) && (
                        <Card className="shadow-primary-lg">
                            <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><LightbulbIcon className="h-5 w-5 text-primary" />Adaptação para Plataformas</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {result.platformAdaptations.tiktok && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><TikTokIcon className="h-4 w-4" /> TikTok</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.tiktok}</p>
                                    </div>
                                )}
                                {result.platformAdaptations.reels && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><Instagram className="h-4 w-4" /> Reels</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.reels}</p>
                                    </div>
                                )}
                                {result.platformAdaptations.shorts && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><Youtube className="h-4 w-4" /> Shorts</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.shorts}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-primary-lg">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><Camera className="h-5 w-5 text-primary" />Checklist de Gravação</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {result.takesChecklist.map((take: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                        <span>{take}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
