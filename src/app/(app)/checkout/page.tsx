
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useTransition, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
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
import { Button } from '@/components/ui/button';
import { createAsaasPaymentAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, updateDoc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório e deve conter apenas números.').max(14, 'O CNPJ não pode ter mais que 14 números.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.displayName || '',
      cpfCnpj: '',
    },
  });
  
  useEffect(() => {
    if(user?.displayName) {
        form.setValue('name', user.displayName);
    }
  }, [user, form]);

  const onSubmit = (values: FormSchemaType) => {
    if (!user?.email || !user.uid || !firestore) {
      setError('Usuário não autenticado ou serviço indisponível. Faça login novamente.');
      return;
    }
    if (!plan || !cycle) {
       setError('Plano ou ciclo de pagamento não especificado na URL.');
       return;
    }
    
    setError(null);
    startTransition(async () => {
      const result = await createAsaasPaymentAction({
        ...values,
        cpfCnpj: values.cpfCnpj.replace(/\D/g, ''), // Remove non-digits
        email: user.email!,
        plan: plan as 'pro' | 'premium',
        cycle: cycle as 'monthly' | 'annual',
        userId: user.uid,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.checkoutUrl && result.customerId) {
        // Armazena o customerId no perfil do usuário ANTES de redirecionar
        try {
            const userRef = doc(firestore, `users/${user.uid}`);
            await updateDoc(userRef, { 'subscription.paymentId': result.customerId });
            // Redireciona para o pagamento
            window.location.href = result.checkoutUrl;
        } catch (e: any) {
            setError(`Ocorreu um erro ao salvar suas informações de pagamento: ${e.message}`);
        }
      } else {
        setError('Ocorreu um erro inesperado ao gerar o link de pagamento.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finalizar Assinatura"
        description="Estamos quase lá! Preencha seus dados para ir para o pagamento."
        icon={CreditCard}
      />
      <Card className="max-w-2xl mx-auto border-0 rounded-2xl shadow-primary-lg">
        <CardHeader>
          <CardTitle>Plano Escolhido: {plan} ({cycle})</CardTitle>
          <CardDescription>
            Complete seu cadastro para gerar o link de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu nome completo" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
              </div>
               <div className="space-y-2">
                 <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CPF ou CNPJ</FormLabel>
                        <FormControl>
                            <Input placeholder="000.000.000-00" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
              </div>

               {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro ao Criar Pagamento</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
               )}

              <Button type="submit" disabled={isPending} className="w-full h-11">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ir para o Pagamento
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CheckoutPageContent />
        </Suspense>
    )
}
