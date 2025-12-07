
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AiCareerPackageOutput } from '@/app/(app)/media-kit/actions';
import {
  DollarSign,
  FileText,
  Lightbulb,
  Briefcase,
  Target,
  Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(1, 'As métricas não podem estar vazias.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

export function MediaKitResultView({ result, formValues, isSheetView = false }: { result: any, formValues: FormSchemaType, isSheetView?: boolean }) {
    if (!result) return null;

    return (
        <div className={cn("space-y-8 animate-fade-in", isSheetView ? "p-6" : "")}>
            <InfoCard title="Apresentação para Marcas" icon={FileText} content={result.executiveSummary} />
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <PricingCard title="Tabela de Preços Sugerida" icon={DollarSign} pricing={result.pricingTiers} />
                <InfoList title="Ideias de Colaboração" icon={Lightbulb} items={result.sampleCollaborationIdeas} />
            </div>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <InfoCard title="Sua Proposta de Valor" icon={Target} content={result.valueProposition} />
                <InfoCard title="Alinhamento com a Marca" icon={Briefcase} content={result.brandAlignment} />
            </div>
            <InfoList title="Dicas de Negociação" icon={Handshake} items={result.negotiationTips} />
        </div>
    );
}

function InfoCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
}) {
  return (
    <Card className="shadow-primary-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         <div className="p-4 rounded-xl border bg-muted/30 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
      </CardContent>
    </Card>
  );
}


function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card className="h-full shadow-primary-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-3 rounded-xl bg-muted/30 border"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function PricingCard({
  title,
  icon: Icon,
  pricing,
}: {
  title: string;
  icon: React.ElementType;
  pricing: AiCareerPackageOutput['pricingTiers'];
}) {
  return (
    <Card className="h-full shadow-primary-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-xs text-muted-foreground mb-4'>Valores baseados em suas métricas. Use como ponto de partida.</p>
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Formato</TableHead>
            <TableHead className="text-right">Faixa de Preço</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow>
            <TableCell className="font-medium">Reels</TableCell>
            <TableCell className="text-right font-mono">{pricing.reels || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium">Sequência de Stories</TableCell>
            <TableCell className="text-right font-mono">{pricing.storySequence || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium">Post Estático (Feed)</TableCell>
            <TableCell className="text-right font-mono">{pricing.staticPost || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium text-primary">Pacote Mensal</TableCell>
            <TableCell className="text-right font-mono text-primary font-bold">{pricing.monthlyPackage || 'A calcular'}</TableCell>
            </TableRow>
        </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
