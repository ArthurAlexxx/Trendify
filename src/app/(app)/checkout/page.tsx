
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useTransition, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, CreditCard, ExternalLink, ShieldCheck, Banknote, Webcam } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.').max(18, 'O CPF/CNPJ é muito longo.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
});

type FormSchemaType = z.infer<typeof formSchema>;

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.displayName || '',
      cpfCnpj: '',
      phone: '',
      postalCode: '',
      addressNumber: '',
      billingType: 'PIX',
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
        cpfCnpj: values.cpfCnpj.replace(/\D/g, ''),
        phone: values.phone.replace(/\D/g, ''),
        postalCode: values.postalCode.replace(/\D/g, ''),
        email: user.email!,
        plan: plan as 'pro' | 'premium',
        cycle: cycle as 'monthly' | 'annual',
        userId: user.uid,
      });

      if (result.error) {
        setError(result.error);
        toast({
          title: 'Erro ao Criar Pagamento',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError('Ocorreu um erro inesperado ao gerar o link de pagamento.');
         toast({
          title: 'Erro Inesperado',
          description: 'Não foi possível gerar o link de pagamento. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };
  
  const priceMap = {
    pro: { monthly: 'R$5', annual: 'R$5' },
    premium: { monthly: 'R$5', annual: 'R$5' },
  };

  const getPrice = () => {
      if (plan && cycle && (plan === 'pro' || plan === 'premium') && (cycle === 'monthly' || cycle === 'annual')) {
          return priceMap[plan][cycle];
      }
      return 'R$0';
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finalizar Assinatura"
        description="Estamos quase lá! Preencha seus dados para ir para o pagamento."
      />
      <Card className="max-w-2xl mx-auto border-0 rounded-2xl shadow-primary-lg">
        <CardHeader>
          <div className="text-center">
            <p className="text-muted-foreground">Você está assinando</p>
            <h2 className="text-2xl font-bold font-headline">Plano {plan} <span className="capitalize">({cycle})</span></h2>
            <p className="text-3xl font-bold mt-2">{getPrice()}</p>
          </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="billingType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-semibold">Forma de Pagamento</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="PIX" id="pix" className="sr-only" />
                          </FormControl>
                          <Label htmlFor="pix" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary">
                            <Banknote className="mb-3 h-6 w-6" /> PIX
                          </Label>
                        </FormItem>
                         <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="CREDIT_CARD" id="cc" className="sr-only" />
                          </FormControl>
                          <Label htmlFor="cc" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary">
                            <CreditCard className="mb-3 h-6 w-6" /> Cartão
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h4 className="font-semibold pt-4">Dados do Pagador</h4>
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


               {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro ao Criar Pagamento</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
               )}

              <Button type="submit" disabled={isPending} className="w-full h-11">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
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
