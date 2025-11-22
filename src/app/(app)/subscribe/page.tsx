
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
import { Check, Star, ArrowRight } from 'lucide-react';
import { useUser } from '@/firebase';
import { useState, useMemo } from 'react';
import type { Plan } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscribePage() {
  const { isUserLoading } = useUser();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();

  const isLoading = isUserLoading || isSubscriptionLoading;

  if (isLoading) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Nossos Planos"
          description="Desbloqueie todo o potencial da IA para acelerar seu crescimento."
        />
        <div className="grid lg:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const PlanCard = ({
      plan,
      title,
      price,
      description,
      features,
      isPremium = false
  }: {
      plan: 'pro' | 'premium',
      title: string,
      price: string,
      description: string,
      features: string[],
      isPremium?: boolean
  }) => {
      const isCurrentPlan = subscription?.plan === plan && subscription?.status === 'active';
      const buttonText = isCurrentPlan ? 'Seu Plano Atual' : `Selecionar ${title}`;
      
      return (
        <Card className={cn(
            "rounded-2xl shadow-lg shadow-primary/5 flex flex-col h-full text-center sm:text-left",
            isCurrentPlan && 'border-primary ring-2 ring-primary',
            isPremium && 'border-yellow-400'
        )}>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center justify-center sm:justify-start gap-2">
              {title}
              {isPremium && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
            <p className="text-4xl font-bold pt-2">
              {price}
              <span className="text-lg font-normal text-muted-foreground">
                /mês
              </span>
            </p>
          </CardHeader>
          <CardContent className='flex-grow'>
            <ul className="space-y-3 text-sm text-foreground">
              {features.map((feature, index) => (
                 <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: feature }} />
                 </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className={cn("w-full", isPremium && 'bg-yellow-500 hover:bg-yellow-500/90')} disabled={isCurrentPlan}>
               <Link href={`/checkout?plan=${plan}`}>{buttonText}</Link>
            </Button>
          </CardFooter>
        </Card>
      )
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Selecione seu Plano"
        description="Escolha o plano ideal para o seu momento e acelere seu crescimento."
      />

      <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
        <PlanCard
          plan="pro"
          title="Plano Pro"
          price="R$49"
          description="Para criadores que levam o crescimento a sério."
          features={[
            'Gerações de IA <b>ilimitadas</b>',
            'Planejamento de conteúdo semanal',
            'Calendário de publicações',
            'Análise de Vídeo com IA (3/dia)',
            'Suporte via e-mail',
          ]}
        />
         <PlanCard
          plan="premium"
          title="Plano Premium"
          price="R$99"
          description="Acesso exclusivo e suporte prioritário."
          isPremium
          features={[
            '<b>Tudo do plano PRO</b>',
            'Análise de Vídeo com IA (10/dia)',
            'Assistente de Propostas para Publis',
            'Gerador de Mídia Kit profissional',
            'Acesso antecipado a novas ferramentas',
            'Suporte prioritário via WhatsApp',
          ]}
        />
      </div>
    </div>
  );
}

    
