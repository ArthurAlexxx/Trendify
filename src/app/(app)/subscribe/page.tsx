
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, QrCode, Sparkles, Copy } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useActionState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPixChargeAction } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});

// A custom action that wraps the server action with token handling
const createPixChargeActionWithAuth = async (prevState: any, formData: FormData) => {
    const { getAuth, getIdToken } = await import('firebase/auth');
    const auth = getAuth();
    if (!auth.currentUser) {
        return { error: 'Usuário não autenticado.' };
    }
    const token = await getIdToken(auth.currentUser);

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    
    // This is a workaround to pass formData to a fetch-based server action
    const body = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
        body.append(key, value as string);
    }

    const response = await fetch('/api/actions/create-pix-charge', {
        method: 'POST',
        headers,
        body: formData,
    });
    
    return response.json();
}


export default function SubscribePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const formRef = useRef<HTMLFormElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      taxId: '',
    },
  });

  const [state, formAction, isGenerating] = useActionState(createPixChargeAction, null);

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.displayName || '',
        email: userProfile.email || '',
        taxId: '',
      });
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar PIX',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' });
  };
  
  const handleFormAction = async (formData: FormData) => {
      if (!user) {
        toast({ title: 'Erro de Autenticação', description: 'Por favor, faça login novamente.', variant: 'destructive'});
        return;
      }
      const token = await user.getIdToken();
      
      const customFormData = new FormData();
      for (const [key, value] of formData.entries()) {
          customFormData.append(key, value);
      }
      customFormData.append('__token', token);

      formAction(customFormData);
  }

  const result = state?.data;

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
              {isLoadingProfile && <Skeleton className='h-48 w-full'/>}
              
              {!result && !isGenerating && !isLoadingProfile && (
                <Form {...form}>
                    <form action={formAction} className='space-y-6'>
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
                        <Button type="submit" className='w-full' disabled={isGenerating}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar QR Code PIX
                        </Button>
                    </form>
                </Form>
              )}

              {isGenerating && !result && (
                <div className='flex flex-col items-center justify-center h-64 text-center'>
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-semibold">Gerando seu PIX...</p>
                    <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
                </div>
              )}

              {result && (
                <div className="flex flex-col items-center text-center">
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
