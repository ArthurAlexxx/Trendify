
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Copy, ArrowLeft, Check, Star, ShieldAlert, Crown } from 'lucide-react';
import { useUser } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  useEffect,
  useState,
  useCallback,
  Suspense,
  useTransition,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPixChargeAction, PixChargeResponse } from '@/app/(app)/subscribe/actions';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  planId: z.string().min(1, 'O ID do plano é obrigatório.'),
});

type FormData = z.infer<typeof formSchema>;

type ActionState = {
  data?: PixChargeResponse;
  error?: string;
} | null;


const planDetails: Record<string, { name: string; price: string; cycle: string; features: string[] }> = {
    'pro-monthly': { name: 'Plano Pro', price: 'R$29', cycle: 'mês', features: [
      'Gerações de IA ilimitadas',
      'Mídia kit e propostas automáticas',
      'Planejamento semanal com IA',
    ] },
    'premium-monthly': { name: 'Plano Premium', price: 'R$39', cycle: 'mês', features: [
      'Tudo do plano PRO',
      'Acesso antecipado a novas ferramentas',
      'Suporte prioritário via WhatsApp',
    ]},
    'pro-annual': { name: 'Plano Pro Anual', price: 'R$299', cycle: 'ano', features: [
      'Gerações de IA ilimitadas',
      'Mídia kit e propostas automáticas',
      'Planejamento semanal com IA',
    ]},
    'premium-annual': { name: 'Plano Premium Anual', price: 'R$399', cycle: 'ano', features: [
      'Tudo do plano PRO',
      'Acesso antecipado a novas ferramentas',
      'Suporte prioritário via WhatsApp',
    ]},
};


function CheckoutPageContent() {
  const { user, isUserLoading } = useUser();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const planId = searchParams.get('planId');
  const selectedPlanDetails = planId ? planDetails[planId] : null;

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isGenerating, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      taxId: '',
      cellphone: '',
      userId: '',
      planId: planId || '',
    },
  });

  const formAction = async (formData: FormData) => {
    startTransition(async () => {
      const cleanedData = {
          ...formData,
          taxId: formData.taxId.replace(/\D/g, ''),
          cellphone: formData.cellphone.replace(/\D/g, ''),
      };
      const result = await createPixChargeAction(null, cleanedData);
      setState(result);
    });
  };

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || '',
        email: user.email || '',
        taxId: '',
        cellphone: '',
        userId: user.uid,
        planId: planId || '',
      });
    }
  }, [user, planId, form]);
  
  useEffect(() => {
    if (planId) {
      form.setValue('planId', planId);
    }
  }, [planId, form]);


  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar PIX',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);
  
  useEffect(() => {
    if (!isUserLoading && !planId) {
      router.replace('/subscribe');
    }
  }, [planId, isUserLoading, router]);

  // Effect to watch for subscription activation
  useEffect(() => {
    const planFromId = planId?.split('-')[0];
    if (subscription?.status === 'active' && subscription.plan === planFromId) {
      setShowSuccessModal(true);
    }
  }, [subscription, planId]);

  const copyToClipboard = useCallback(
    (text: string) => {
      if (!navigator.clipboard) {
        toast({
          title: 'Cópia não suportada',
          description: 'Seu navegador não suporta a cópia automática. Por favor, copie manualmente.',
          variant: 'destructive',
        });
        return;
      }
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast({
            title: 'Copiado!',
            description: 'Código PIX copiado para a área de transferência.',
          });
        })
        .catch((err) => {
          console.error('Failed to copy: ', err);
          toast({
            title: 'Erro ao Copiar',
            description: 'Não foi possível copiar o código. Verifique as permissões do seu navegador.',
            variant: 'destructive',
          });
        });
    },
    [toast]
  );

  const result = state?.data;
  const planFromId = planId?.split('-')[0];
  const isAlreadySubscribedToThisPlan = subscription?.plan === planFromId && subscription?.status === 'active';

  if (isUserLoading || !planId || !selectedPlanDetails || isSubscriptionLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Sheet open={showSuccessModal}>
      <SheetContent>
        <SheetHeader className="items-center text-center">
           <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20">
             <Crown className="h-10 w-10 text-primary animate-pulse" />
           </div>
          <SheetTitle className="text-2xl font-bold font-headline">
            {planFromId === 'premium' ? 'Parabéns, você agora é Premium!' : 'Parabéns, você agora é Pro!'}
          </SheetTitle>
          <SheetDescription>
            Sua assinatura foi ativada com sucesso. Explore todas as ferramentas e comece a acelerar seu crescimento agora mesmo.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="pt-8">
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Começar a usar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Finalizar Assinatura"
          description={`Você está a um passo de desbloquear o ${selectedPlanDetails.name}.`}
        />
        <Button variant="ghost" asChild>
          <Link href="/subscribe">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para os planos
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3">
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Pagamento via PIX
              </CardTitle>
              <CardDescription>
                {isAlreadySubscribedToThisPlan 
                    ? 'Você já é assinante deste plano.'
                    : 'Preencha seus dados para gerar o QR Code de pagamento.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAlreadySubscribedToThisPlan ? (
                <div className="flex flex-col items-center text-center py-10">
                    <ShieldAlert className="h-12 w-12 text-primary mb-4" />
                    <h3 className="text-xl font-bold">Você já possui este plano</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Seu plano {selectedPlanDetails.name} já está ativo. Você pode gerenciar sua assinatura nas <Link href="/settings" className="font-semibold text-primary hover:underline">configurações</Link>.
                    </p>
                    <Button asChild className='mt-6 w-full sm:w-auto'>
                        <Link href="/dashboard">
                            Ir para o Painel
                        </Link>
                    </Button>
                </div>
              ) : !result && !isGenerating ? (
                <Form {...form}>
                  <form 
                     onSubmit={form.handleSubmit(data => formAction(data))}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="planId"
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />
                    <input type="hidden" {...form.register('userId')} />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className="bg-muted/50" />
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
                            <Input {...field} readOnly className="bg-muted/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} />
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
                              <Input placeholder="(99) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isGenerating}>
                      {isGenerating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Gerar QR Code PIX
                    </Button>
                  </form>
                </Form>
              ) : isGenerating && !result ? (
                <div className="flex flex-col items-center justify-center h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="font-semibold">Gerando seu PIX...</p>
                  <p className="text-sm text-muted-foreground">
                    Aguarde um momento.
                  </p>
                </div>
              ) : result ? (
                <div className="flex flex-col items-center text-center animate-fade-in">
                  <p className="text-muted-foreground mb-4">
                    Escaneie o QR Code abaixo com o app do seu banco para pagar.
                  </p>
                  <div className="p-4 bg-white rounded-lg border">
                    <Image
                      src={result.brCodeBase64}
                      alt="PIX QR Code"
                      width={256}
                      height={256}
                    />
                  </div>
                  <p className="text-sm mt-4 font-semibold">
                    Válido por 1 hora
                  </p>

                  <div className="w-full mt-6 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Ou use o PIX Copia e Cola:
                    </p>
                    <div className="relative">
                      <Input
                        value={result.brCode}
                        readOnly
                        className="pr-10 h-11 bg-muted/50"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => copyToClipboard(result.brCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                       Sua assinatura será ativada automaticamente após o pagamento. Fique nesta página ou volte mais tarde.
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-8">
                    Após o pagamento, sua assinatura será ativada
                    automaticamente. Você pode fechar esta tela.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
            <Card className="rounded-2xl border-0 sticky top-24">
                 <CardHeader>
                    <CardTitle className='font-headline text-xl'>Resumo do Pedido</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                        <div className='flex justify-between items-center'>
                            <p className='text-muted-foreground'>Plano</p>
                            <p className='font-semibold flex items-center gap-2'>
                                {selectedPlanDetails.name}
                                {planFromId === 'premium' && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                            </p>
                        </div>
                        <div className='flex justify-between items-center'>
                            <p className='text-muted-foreground'>Valor</p>
                            <p className='font-semibold'>{selectedPlanDetails.price}/{selectedPlanDetails.cycle}</p>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground pt-4 border-t">
                            {selectedPlanDetails.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
    </>
  );
}


export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CheckoutPageContent />
        </Suspense>
    )
}

    