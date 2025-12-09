
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, Star, Crown } from 'lucide-react';
import Link from 'next/link';

const proFeatures = [
    "Gerações de IA ilimitadas",
    "Planejamento de conteúdo semanal",
    "Calendário de publicações",
    "Análise de Vídeo (3/dia)",
    "Suporte via e-mail"
]

const premiumFeatures = [
    "Tudo do plano Pro, e mais:",
    "Sincronização automática de métricas",
    "Análise de Vídeo (10/dia)",
    "Assistente de propostas para Publis",
    "Gerador de Mídia Kit profissional",
    "Acesso antecipado a novas ferramentas"
]

export default function SubscribePage() {

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planos de Assinatura"
        description="Escolha o plano que melhor se adapta à sua jornada de criador."
        icon={Crown}
      />
      
        <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
            {/* Plano Pro */}
            <Card className="rounded-2xl border-0 flex flex-col h-full shadow-primary-lg">
                <CardHeader className='text-center'>
                    <CardTitle className="font-headline text-xl flex items-center gap-2 justify-center">
                        <Star className="w-5 h-5 text-primary" />
                        Pro
                    </CardTitle>
                    <p className="text-3xl font-bold">R$39,99<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent className='flex-grow'>
                    <ul className="space-y-3 text-sm text-foreground">
                        {proFeatures.map(feature => (
                             <li key={feature} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                 <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href={`/checkout?plan=pro&cycle=monthly`}>Assinar Plano Pro Mensal</Link>
                    </Button>
                     <Button asChild className="w-full" variant="outline">
                        <Link href={`/checkout?plan=pro&cycle=annual`}>Economize com o Plano Anual (R$399)</Link>
                    </Button>
                </CardFooter>
            </Card>

            {/* Plano Premium */}
            <Card className="rounded-2xl border-2 border-primary relative flex flex-col h-full shadow-primary-lg">
                 <CardHeader className='text-center'>
                    <CardTitle className="font-headline text-xl flex items-center gap-2 justify-center">
                        <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Premium
                    </CardTitle>
                    <p className="text-3xl font-bold">R$49,99<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent className='flex-grow'>
                    <ul className="space-y-3 text-sm text-foreground">
                       {premiumFeatures.map(feature => (
                             <li key={feature} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                 <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href={`/checkout?plan=premium&cycle=monthly`}>Assinar Plano Premium Mensal</Link>
                    </Button>
                     <Button asChild className="w-full" variant="outline">
                        <Link href={`/checkout?plan=premium&cycle=annual`}>Economize com o Plano Anual (R$499)</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
