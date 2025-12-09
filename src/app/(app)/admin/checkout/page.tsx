
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createAsaasPaymentAction } from '@/app/(app)/checkout/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, updateDoc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório e deve conter apenas números.').max(14, 'O CNPJ não pode ter mais que 14 números.'),
  productName: z.string().min(1, 'O nome do produto é obrigatório.'),
  productValue: z.number().min(1, 'O valor deve ser maior que zero.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function AdminCheckoutTestPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.displayName || '',
      cpfCnpj: '',
      productName: 'Plano Premium Mensal (Teste)',
      productValue: 39,
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.setValue('name', user.displayName);
    }
  }, [user, form]);

  const onSubmit = (values: FormSchemaType) => {
    if (!user?.email || !user.uid || !firestore) {
      setError('Usuário não autenticado ou serviço indisponível. Faça login novamente.');
      return;
    }
    
    setError(null);
    startTransition(async () => {
      const result = await createAsaasPaymentAction({
        name: values.name,
        cpfCnpj: values.cpfCnpj.replace(/\D/g, ''), // Remove non-digits
        email: user.email!,
        // Hardcoding to a specific plan for testing purposes
        plan: 'premium',
        cycle: 'monthly',
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
        title="Checkout de Teste"
        description="Esta página simula um fluxo de pagamento real utilizando o Asaas em ambiente de sandbox."
        icon={CreditCard}
      />

      <Card className="max-w-2xl mx-auto shadow-primary-lg">
        <CardHeader>
          <CardTitle>Simular Pagamento com Asaas</CardTitle>
          <CardDescription>Insira os detalhes para gerar um link de pagamento de teste.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
               <div className="space-y-2">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome Completo (do Pagador)</FormLabel>
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
                        <FormLabel>CPF ou CNPJ (do Pagador)</FormLabel>
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
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar Link de Pagamento de Teste
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
