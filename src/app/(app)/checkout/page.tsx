

'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useTransition, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { createAsaasCustomerAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  const { user } = useUser();
  
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState<string | null>(null);
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
    if (!user?.email) {
      setError('E-mail do usuário não encontrado. Faça login novamente.');
      return;
    }
    
    setError(null);
    startTransition(async () => {
      const result = await createAsaasCustomerAction({
        ...values,
        email: user.email!,
      });

      if (result.error) {
        setError(result.error);
        setCustomerId(null);
      } else if (result.customerId) {
        setCustomerId(result.customerId);
        setError(null);
        // Próximo passo: Usar o customerId para criar a cobrança
      }
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finalizar Assinatura"
        description="Estamos quase lá! Preencha seus dados para continuar."
        icon={CreditCard}
      />
      <Card className="max-w-2xl mx-auto border-0 rounded-2xl shadow-primary-lg">
        <CardHeader>
          <CardTitle>Plano Escolhido: {plan} ({cycle})</CardTitle>
          <CardDescription>
            Complete seu cadastro na plataforma de pagamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerId ? (
             <Alert variant="default" className="bg-green-500/10 border-green-500/20 text-green-700">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Sucesso!</AlertTitle>
                <AlertDescription>
                   Seu cadastro na plataforma de pagamento foi criado com o ID: <strong>{customerId}</strong>.
                   O próximo passo (geração da cobrança) será implementado em breve.
                </AlertDescription>
            </Alert>
          ) : (
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
                    <AlertTitle>Erro ao Criar Cliente</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
               )}

              <Button type="submit" disabled={isPending} className="w-full h-11">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e ir para o Pagamento
              </Button>
            </form>
          </Form>
          )}
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
