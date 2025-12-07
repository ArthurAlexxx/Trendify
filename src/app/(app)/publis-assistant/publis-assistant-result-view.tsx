
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Check,
  Clapperboard,
  Lightbulb,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { z } from 'zod';

const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  targetAudience: z.string().min(10, 'O público-alvo deve ter pelo menos 10 caracteres.'),
  differentiators: z.string().min(10, 'Os diferenciais devem ter pelo menos 10 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
  extraInfo: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

function InfoListCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card className="shadow-primary-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
                <Check className='h-4 w-4 text-primary mt-1 shrink-0' />
                <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PublisAssistantResultView({ result, formValues, isSheetView = false }: { result: any, formValues: FormSchemaType, isSheetView?: boolean }) {
    if (!result) return null;

    return (
        <div className={cn("space-y-8 animate-fade-in", isSheetView ? "p-6" : "")}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-primary-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                                <Clapperboard className="h-5 w-5 text-primary" />
                                <span>5 Roteiros Prontos para Gravar</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible defaultValue='item-0' className="w-full">
                                {result.scripts.map((script: any, index: number) => (
                                    <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger className="font-semibold text-base hover:no-underline text-left">Roteiro {index + 1}: {script.gancho}</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div>
                                                <h4 className='font-semibold text-foreground mb-1'>Roteiro:</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{script.script}</p>
                                            </div>
                                            <div>
                                                <h4 className='font-semibold text-foreground mb-1'>Call to Action (CTA):</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{script.cta}</p>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card className="shadow-primary-lg">
                        <CardHeader><CardTitle className="flex items-center gap-3 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-primary" />Ângulos Criativos e Tom de Voz</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold mb-2">Ângulos para Campanha</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {result.creativeAngles.map((angle: string, i: number) => <li key={i} className='flex items-start gap-2'><Sparkles className='h-4 w-4 text-primary shrink-0 mt-1' /><span>{angle}</span></li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Adaptações de Tom</h4>
                                <div className="space-y-3">
                                    {result.brandToneAdaptations.map((adaptation: any, i: number) => (
                                        <p key={i} className="text-sm">
                                            <strong className='font-semibold text-foreground'>{adaptation.titulo}: </strong> 
                                            <span className='text-muted-foreground'>{adaptation.texto}</span>
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="shadow-primary-lg">
                        <CardHeader><CardTitle className="flex items-center gap-3 text-lg font-semibold"><Target className="h-5 w-5 text-primary" />Projeção de Conversão</CardTitle></CardHeader>
                        <CardContent className='space-y-1 text-center'>
                            <p className='font-semibold text-foreground'>{result.conversionProjection.roteiro}</p>
                            <p className='text-sm text-muted-foreground whitespace-pre-wrap'>{result.conversionProjection.justificativa}</p>
                        </CardContent>
                    </Card>
                    <InfoListCard
                        title="Checklist de Conversão"
                        icon={Check}
                        items={result.conversionChecklist}
                    />
                    <InfoListCard
                        title="Variações com Trends"
                        icon={Zap}
                        items={result.trendVariations.map((v: any) => v.variacao)}
                    />
                </div>
            </div>
        </div>
    )
}

    