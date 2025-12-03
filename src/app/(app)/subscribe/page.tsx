
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
import { Check, Star } from 'lucide-react';
import { useUser } from '@/firebase';
import { useState } from 'react';
import type { Plan } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BillingCycle = 'monthly' | 'annual';

export default function SubscribePage() {
  const { isUserLoading } = useUser();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const isLoading = isUserLoading || isSubscriptionLoading;

  const plans = {
    monthly: [
      {
        id: 'pro-monthly',
        plan: 'pro' as Plan,
        title: 'Plano Pro',
        price: 'R$29',
        priceSuffix: '/mês',
        description: 'Para criadores que levam o crescimento a sério.',
        features: [
          'Gerações de conteúdo <b>ilimitadas</b>',
          'Planejamento de conteúdo semanal com IA',
          'Calendário editorial completo',
          'Análise de Vídeo (3/dia)',
          'Suporte via e-mail',
        ],
        isPremium: false,
      },
      {
        id: 'premium-monthly',
        plan: 'premium' as Plan,
        title: 'Plano Premium',
        price: 'R$39',
        priceSuffix: '/mês',
        description: 'Acesso total, automação e monetização.',
        features: [
          '<b>Tudo do plano PRO</b>',
          '<b>Sincronização automática</b> de métricas',
          'Análise de Vídeo (10/dia)',
          'Assistente de Propostas para Publis',
          'Gerador de Mídia Kit profissional',
          'Acesso antecipado a novas ferramentas',
        ],
        isPremium: true,
      },
    ],
    annual: [
      {
        id: 'pro-annual',
        plan: 'pro' as Plan,
        title: 'Plano Pro Anual',
        price: 'R$299',
        priceSuffix: '/ano',
        description: 'Dois meses de desconto no plano anual.',
        features: [
          'Gerações de conteúdo <b>ilimitadas</b>',
          'Planejamento de conteúdo semanal com IA',
          'Calendário editorial completo',
          'Análise de Vídeo (3/dia)',
          'Suporte via e-mail',
        ],
        isPremium: false,
      },
      {
        id: 'premium-annual',
        plan: 'premium' as Plan,
        title: 'Plano Premium Anual',
        price: 'R$399',
        priceSuffix: '/ano',
        description: 'Economize e tenha acesso total o ano todo.',
        features: [
          '<b>Tudo do plano PRO</b>',
          '<b>Sincronização automática</b> de métricas',
          'Análise de Vídeo (10/dia)',
          'Assistente de Propostas para Publis',
          'Gerador de Mídia Kit profissional',
          'Acesso antecipado a novas ferramentas',
        ],
        isPremium: true,
      },
    ],
  };

  const PlanCard = ({
      planDetails
  }: {
      planDetails: typeof plans[BillingCycle][number]
  }) => {
      const isCurrentPlan = subscription?.plan === planDetails.plan && subscription?.status === 'active';
      const buttonText = isCurrentPlan ? 'Seu Plano Atual' : `Selecionar ${planDetails.title}`;
      
      return (
        <Card className={cn(
            "rounded-2xl border-0 flex flex-col h-full",
            isCurrentPlan && 'border-primary ring-2 ring-primary',
            planDetails.isPremium && 'border-yellow-400'
        )}>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              {planDetails.title}
              {planDetails.isPremium && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
            </CardTitle>
            <CardDescription>{planDetails.description}</CardDescription>
            <p className="text-4xl font-bold pt-2">
              {planDetails.price}
              <span className="text-lg font-normal text-muted-foreground">
                {planDetails.priceSuffix}
              </span>
            </p>
          </CardHeader>
          <CardContent className='flex-grow'>
            <ul className="space-y-3 text-sm text-foreground">
              {planDetails.features.map((feature, index) => (
                 <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: feature }} />
                 </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className={cn("w-full", planDetails.isPremium && 'bg-yellow-500 hover:bg-yellow-500/90')} disabled={isCurrentPlan}>
               <Link href={'/dashboard'}>{buttonText}</Link>
            </Button>
          </CardFooter>
        </Card>
      )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Selecione seu Plano"
        description="Escolha o plano ideal para o seu momento e acelere seu crescimento."
      />
      
      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)} className="w-auto">
            <TabsList>
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
                <TabsTrigger value="annual">Anual (Economize 2 meses)</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
            {plans[billingCycle].map(plan => (
                <PlanCard key={plan.id} planDetails={plan} />
            ))}
        </div>
      )}
    </div>
  );
}
