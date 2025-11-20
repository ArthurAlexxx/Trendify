
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Sparkles, Copy, RefreshCw, Star } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useActionState, useEffect, useTransition, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPixChargeAction } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile, Plan } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';


const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  plan: z.enum(['pro', 'premium']),
});

type FormData = z.infer<typeof formSchema>;

export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingStatus, startCheckingTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | 'free'>('pro');
  
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      taxId: '',
      cellphone: '',
      userId: '',
      plan: 'pro'
    },
  });

  const [state, formAction, isGenerating] = useActionState(createPixChargeAction, null);

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || '',
        email: user.email || '',
        taxId: '',
        cellphone: '',
        userId: user.uid,
        plan: selectedPlan !== 'free' ? selectedPlan : 'pro',
      });
    }
  }, [user, form, selectedPlan]);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar PIX',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);


  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' });
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({ title: 'Erro ao Copiar', description: 'Não foi possível copiar o código.', variant: 'destructive' });
    });
  }, [toast]);
  
  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || !firestore) return;
  
    const userRef = doc(firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userRef);
  
    if (docSnap.exists()) {
      const userProfile = docSnap.data() as UserProfile;
      if (userProfile.subscription?.status === 'active') {
        setShowSuccess(true);
        toast({
          title: 'Plano Ativado!',
          description: 'Sua assinatura está ativa. Redirecionando...',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        toast({
          title: 'Aguardando Pagamento',
          description: 'Seu plano será ativado assim que o pagamento for confirmado.',
        });
      }
    }
  }, [user, firestore, toast, router]);

  const handleCheckStatus = useCallback(() => {
    startCheckingTransition(() => {
      checkSubscriptionStatus();
    });
  }, [checkSubscriptionStatus]);
  
  const handlePlanSelection = (plan: Plan | 'free') => {
      if (plan !== 'free') {
        setSelectedPlan(plan);
        form.setValue('plan', plan);
      }
  };

  const result = state?.data;
  
  if (showSuccess) {
     return (
       <div className="flex flex-col items-center justify-center text-center h-96">
        <Check className="h-16 w-16 text-green-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold">Você agora é PRO!</h2>
        <p className="text-muted-foreground">Redirecionando para seu painel...</p>
      </div>
     )
  }

  const isLoading = isUserLoading || isSubscriptionLoading;

  if (isLoading) {
    return (
        <div className="space-y-12">
            <PageHeader
                title="Nossos Planos"
                description="Desbloqueie todo o potencial da IA para acelerar seu crescimento."
            />
            <div className="grid lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
                 <div className="lg:col-span-3">
                   <Skeleton className="h-[500px] w-full rounded-2xl" />
                </div>
            </div>
        </div>
    )
  }
  
  return (
    <div className="space-y-12">
      <PageHeader
        title="Nossos Planos"
        description="Desbloqueie todo o potencial da IA para acelerar seu crescimento."
      />

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Plan Cards */}
        <div className="lg:col-span-2 space-y-8">
            <Card onClick={() => handlePlanSelection('pro')} className={cn("rounded-2xl shadow-lg shadow-primary/5 cursor-pointer transition-all", selectedPlan === 'pro' && 'border-primary ring-2 ring-primary')}>
              <CardHeader>
                <CardTitle className='font-headline text-xl'>Plano Pro</CardTitle>
                <p className="text-4xl font-bold pt-2">
                    R$49{' '}
                    <span className="text-lg font-normal text-muted-foreground">
                        /mês
                    </span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Gerações de IA **ilimitadas**</span></li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Mídia kit e propostas automáticas</span></li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Análise de vídeos publicados</span></li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Planejamento semanal com IA</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card onClick={() => handlePlanSelection('premium')} className={cn("rounded-2xl shadow-lg shadow-primary/5 cursor-pointer transition-all", selectedPlan === 'premium' && 'border-primary ring-2 ring-primary')}>
                 <CardHeader>
                    <CardTitle className='font-headline text-xl flex items-center gap-2'>Plano Premium <Star className='w-5 h-5 text-yellow-400 fill-yellow-400' /></CardTitle>
                    <p className="text-4xl font-bold pt-2">
                        R$99{' '}
                        <span className="text-lg font-normal text-muted-foreground">
                            /mês
                        </span>
                    </p>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3 text-sm text-foreground">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>**Tudo do plano PRO**</span></li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Acesso antecipado a novas ferramentas</span></li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Consultoria IA Avançada (em breve)</span></li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span>Suporte prioritário via WhatsApp</span></li>
                    </ul>
                </CardContent>
            </Card>
        </div>


        {/* Payment Form */}
        <div className="lg:col-span-3">
             <Card className="rounded-2xl shadow-lg shadow-primary/5">
                <CardHeader>
                    <CardTitle className='font-headline text-xl'>Pagamento via PIX</CardTitle>
                    <CardDescription>Preencha seus dados para gerar o QR Code para o plano <span className='font-bold text-primary'>{selectedPlan.toUpperCase()}</span>.</CardDescription>
                </CardHeader>
                <CardContent>
                  {subscription?.status === 'active' ? (
                     <div className="flex flex-col items-center justify-center h-96 text-center">
                        <Check className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold">Você já é um Assinante!</h3>
                        <p className="text-muted-foreground">Sua assinatura do plano {subscription.plan?.toUpperCase()} está ativa.</p>
                        <Button asChild className="mt-6">
                            <Link href="/dashboard">Ir para o Painel</Link>
                        </Button>
                    </div>
                  ) : !result && !isGenerating ? (
                    <Form {...form}>
                        <form action={formAction} className='space-y-6'>
                             <input type="hidden" {...form.register('plan')} value={selectedPlan !== 'free' ? selectedPlan : 'pro'} />
                            <input type="hidden" {...form.register('userId')} />
                            <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                    <Input {...field} readOnly className='bg-muted/50' />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <FormControl>
                                    <Input {...field} readOnly className='bg-muted/50' />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="taxId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>CPF</FormLabel>
                                        <FormControl>
                                            <Input placeholder='000.000.000-00' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cellphone"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Celular com DDD</FormLabel>
                                        <FormControl>
                                            <Input placeholder='(99) 99999-9999' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" className='w-full' disabled={isGenerating || !user}>
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gerar QR Code PIX
                            </Button>
                        </form>
                    </Form>
                  ) : isGenerating && !result ? (
                    <div className='flex flex-col items-center justify-center h-96 text-center'>
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="font-semibold">Gerando seu PIX...</p>
                        <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
                    </div>
                  ) : result ? (
                    <div className="flex flex-col items-center text-center animate-fade-in">
                        <p className='text-muted-foreground mb-4'>Escaneie o QR Code abaixo com o app do seu banco para pagar.</p>
                        <div className='p-4 bg-white rounded-lg border'>
                            <Image src={result.brCodeBase64} alt="PIX QR Code" width={256} height={256} />
                        </div>
                        <p className='text-sm mt-4 font-semibold'>Válido por 1 hora</p>
                        
                        <div className='w-full mt-6 space-y-4'>
                            <p className='text-muted-foreground text-sm'>Ou use o PIX Copia e Cola:</p>
                            <div className="relative">
                                <Input value={result.brCode} readOnly className="pr-10 h-11 bg-muted/50"/>
                                <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => copyToClipboard(result.brCode)}>
                                    <Copy className='h-4 w-4' />
                                </Button>
                            </div>
                            <Button onClick={handleCheckStatus} className="w-full" variant="secondary" disabled={isCheckingStatus}>
                                {isCheckingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Já paguei, verificar status
                            </Button>
                        </div>

                        <p className='text-xs text-muted-foreground mt-8'>Após o pagamento, sua assinatura será ativada automaticamente. Você pode fechar esta tela.</p>
                    </div>
                  ) : null}

                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
