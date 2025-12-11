
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2, AlertTriangle, ExternalLink, XCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createAsaasPaymentAction } from '@/app/(app)/checkout/actions';
import { cancelAsaasCheckoutAction } from '@/app/(app)/admin/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.').max(14, 'O CNPJ não pode ter mais que 14 números.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function AdminCheckoutTestPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [isCancelling, startCancellingTransition] = useTransition();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.displayName || '',
      email: user?.email || '',
      cpfCnpj: '',
      phone: '',
      postalCode: '',
      addressNumber: '',
      billingType: 'PIX',
      plan: 'pro',
      cycle: 'monthly',
    },
  });

  useEffect(() => {
    if (user) {
        form.setValue('name', user.displayName || '');
        form.setValue('email', user.email || '');
    }
  }, [user, form]);
  
  const resetCheckoutState = () => {
    setCheckoutUrl(null);
    setCheckoutId(null);
    setError(null);
  }

  const onSubmit = (values: FormSchemaType) => {
    if (!user?.uid || !firestore) {
      setError('Usuário não autenticado ou serviço indisponível. Faça login novamente.');
      return;
    }
    
    resetCheckoutState();
    startTransition(async () => {
      const result = await createAsaasPaymentAction({
        ...values,
        cpfCnpj: values.cpfCnpj.replace(/\D/g, ''),
        phone: values.phone.replace(/\D/g, ''),
        postalCode: values.postalCode.replace(/\D/g, ''),
        userId: user.uid,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.checkoutUrl && result.checkoutId) {
         toast({
            title: "Checkout Gerado!",
            description: `Link de pagamento criado com sucesso.`,
         });
         setCheckoutUrl(result.checkoutUrl);
         setCheckoutId(result.checkoutId);
      } else {
        setError('Ocorreu um erro inesperado ao criar o link de checkout.');
      }
    });
  };

  const handleCancelCheckout = () => {
    if (!checkoutId) return;

    startCancellingTransition(async () => {
      const result = await cancelAsaasCheckoutAction({ checkoutId });
      if (result.error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Cancelar',
            description: result.error,
        });
      } else {
        toast({
            title: 'Sucesso!',
            description: 'O checkout foi cancelado.',
        });
        resetCheckoutState();
      }
    });
  }
  
  const handleOpenLink = () => {
      if (checkoutUrl) {
          window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checkout de Teste"
        description="Use esta página para simular o fluxo de pagamento completo com a Asaas."
      />

       <Alert variant="default" className="max-w-2xl mx-auto">
        <Info className="h-4 w-4" />
        <AlertTitle>Debug: ID do Usuário</AlertTitle>
        <AlertDescription>
            O ID do usuário logado que será enviado é: <strong>{user?.uid || 'Nenhum usuário logado'}</strong>
        </AlertDescription>
      </Alert>

      <Card className="max-w-2xl mx-auto shadow-primary-lg">
        <CardHeader>
          <CardTitle>Simular Checkout Asaas</CardTitle>
          <CardDescription>Insira os detalhes para criar um cliente e um link de pagamento no ambiente de sandbox.</CardDescription>
        </CardHeader>
        <CardContent>
         {checkoutUrl ? (
            <div className="space-y-4 text-center">
                <Alert variant="default" className="text-left">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Checkout Criado com Sucesso!</AlertTitle>
                    <AlertDescription>
                        Use os botões abaixo para abrir o link de pagamento ou cancelá-lo.
                    </AlertDescription>
                </Alert>
                <Input value={checkoutUrl} readOnly className="h-11 text-center" />
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleOpenLink} className="w-full h-11">
                        <ExternalLink className="mr-2 h-4 w-4"/> Abrir Link de Pagamento
                    </Button>
                    <Button onClick={handleCancelCheckout} variant="outline" disabled={isCancelling} className="w-full h-11">
                         {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                        Cancelar Checkout
                    </Button>
                 </div>
                 <Button onClick={resetCheckoutState} variant="link">Gerar novo checkout</Button>
            </div>
         ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>E-mail (do Pagador)</FormLabel>
                        <FormControl>
                            <Input placeholder="seu@email.com" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
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
                 <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                                <Input placeholder="(47) 99999-9999" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </div>

               <div className="grid sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                                <Input placeholder="00000-000" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name="addressNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                                <Input placeholder="123" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Plano</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecione o plano" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="cycle"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ciclo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o ciclo" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="billingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cobrança</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione o tipo de pagamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito (Recorrente)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />


               {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro no Processo</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
               )}
              
               <p className="text-xs text-muted-foreground">
                Lembre-se de adicionar a variável de ambiente `ASAAS_API_KEY` para que esta chamada funcione.
               </p>

              <Button type="submit" disabled={isPending} className="w-full h-11">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4"/>}
                Gerar Checkout
              </Button>
            </form>
          </Form>
         )}
        </CardContent>
      </Card>
    </div>
  );
}
