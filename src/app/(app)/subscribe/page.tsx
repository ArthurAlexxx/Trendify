
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { useUser } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useActionState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPixChargeAction } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
});

export default function SubscribePage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingStatus, startCheckingTransition] = useTransition();

  const { subscription, isLoading: isLoadingSubscription } = useSubscription();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      taxId: '',
      cellphone: '',
      userId: '',
    },
  });

  const [state, formAction, isGenerating] = useActionState(createPixChargeAction, null);

  useEffect(() => {
    if (user && !isUserLoading) {
      form.reset({
        name: user.displayName || '',
        email: user.email || '',
        taxId: '',
        cellphone: '',
        userId: user.uid,
      });
    }
  }, [user, isUserLoading, form]);

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
    if (subscription?.status === 'active') {
       toast({
        title: 'Plano Ativado!',
        description: 'Sua assinatura PRO está ativa. Bem-vindo(a)!',
      });
      router.push('/dashboard');
    }
  }, [subscription, router, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' });
  };
  
  const handleCheckStatus = () => {
    startCheckingTransition(() => {
      // The useEffect above will handle redirection if the plan is active
      if (subscription?.status === 'active') {
        // Already handled by useEffect, but for immediate feedback
        toast({ title: 'Plano Ativo!', description: 'Redirecionando para o dashboard...'});
      } else {
        toast({ title: 'Aguardando Pagamento', description: 'Seu plano será ativado assim que o pagamento for confirmado.'});
      }
    })
  }

  const result = state?.data;
  
  if (subscription?.status === 'active') {
     return (
       <div className="flex flex-col items-center justify-center text-center h-96">
        <Check className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold">Você já é PRO!</h2>
        <p className="text-muted-foreground">Redirecionando para seu painel...</p>
      </div>
     )
  }


  return (
    <div className="space-y-12">
      <PageHeader
        title="Assinatura Pro"
        description="Desbloqueie todo o potencial da IA para acelerar seu crescimento."
      />

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <Card className="rounded-2xl shadow-lg shadow-primary/5">
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
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Diagnósticos e ideias **ilimitados**</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Mídia kit e propostas automáticas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Análise de vídeos publicados</span>
              </li>
               <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Planejamento semanal com IA</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Suporte prioritário</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg shadow-primary/5">
            <CardHeader>
                <CardTitle className='font-headline text-xl'>Pagamento via PIX</CardTitle>
                <CardDescription>Preencha seus dados para gerar o QR Code para pagamento.</CardDescription>
            </CardHeader>
            <CardContent>
              {(isUserLoading || isLoadingSubscription) && <Skeleton className='h-96 w-full'/>}
              
              {!result && !isGenerating && !isUserLoading && !isLoadingSubscription && (
                <Form {...form}>
                    <form action={formAction} className='space-y-6'>
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
                        <Button type="submit" className='w-full' disabled={isGenerating || !user}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar QR Code PIX
                        </Button>
                    </form>
                </Form>
              )}

              {isGenerating && !result && (
                <div className='flex flex-col items-center justify-center h-96 text-center'>
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-semibold">Gerando seu PIX...</p>
                    <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
                </div>
              )}

              {result && (
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
              )}

            </CardContent>
        </Card>
      </div>
    </div>
  );
}
