
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
import { Check, Star, Crown, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Plan } from '@/lib/types';


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
    const { subscription, isLoading } = useSubscription();

    const renderPlanButtons = (plan: 'pro' | 'premium') => {
        const isCurrentMonthly = subscription?.plan === plan && subscription?.cycle === 'monthly' && subscription.status === 'active';
        const isCurrentAnnual = subscription?.plan === plan && subscription?.cycle === 'annual' && subscription.status === 'active';

        let monthlyCta = "Assinar Mensal";
        if (subscription?.plan === 'pro' && plan === 'premium') {
            monthlyCta = "Fazer Upgrade (Mensal)";
        }

        let annualCta = "Assinar Anual";
        if (subscription?.plan === 'pro' && plan === 'premium') {
            annualCta = "Fazer Upgrade (Anual)";
        }
        
        return (
            <>
                {isCurrentMonthly ? (
                     <Button className="w-full" disabled>
                        <CheckCircle className="mr-2 h-4 w-4" /> Seu Plano Atual
                    </Button>
                ) : (
                    <Button asChild className="w-full">
                        <Link href={`/checkout?plan=${plan}&cycle=monthly`}>
                            {monthlyCta}
                        </Link>
                    </Button>
                )}

                {isCurrentAnnual ? (
                    <Button className="w-full" variant="outline" disabled>
                        <CheckCircle className="mr-2 h-4 w-4" /> Seu Plano Atual
                    </Button>
                ) : (
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/checkout?plan=${plan}&cycle=annual`}>
                            {`${annualCta} (economize 2 meses)`}
                        </Link>
                    </Button>
                )}
            </>
        )
    }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planos de Assinatura"
        description="Escolha o plano que melhor se adapta à sua jornada de criador."
      />
      
       {isLoading ? (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
       ) : (
        <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
            <Card className="rounded-2xl border-0 flex flex-col h-full shadow-primary-lg">
                <CardHeader className='text-center'>
                    <CardTitle className="font-headline text-xl flex items-center gap-2 justify-center">
                        <Star className="w-5 h-5 text-primary" />
                        Pro
                    </CardTitle>
                    <p className="text-3xl font-bold">R$5,00<span className="text-base font-normal text-muted-foreground">/mês</span></p>
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
                    {renderPlanButtons('pro')}
                </CardFooter>
            </Card>

            <Card className="rounded-2xl border-2 border-primary relative flex flex-col h-full shadow-primary-lg">
                 <CardHeader className='text-center'>
                    <CardTitle className="font-headline text-xl flex items-center gap-2 justify-center">
                        <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Premium
                    </CardTitle>
                    <p className="text-3xl font-bold">R$5,00<span className="text-base font-normal text-muted-foreground">/mês</span></p>
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
                    {renderPlanButtons('premium')}
                </CardFooter>
            </Card>
        </div>
       )}
    </div>
  );
}
