

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useTransition, useEffect } from 'react';
import { Loader2, User, CreditCard, ExternalLink, Banknote, ClipboardCheck } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
import { createAsaasCustomerAction, createAsaasCheckoutAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.').max(18, 'O CPF/CNPJ é muito longo.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
});

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'CREDIT_CARD']),
});

type CustomerFormSchemaType = z.infer<typeof customerFormSchema>;
type PaymentFormSchemaType = z.infer<typeof paymentFormSchema>;


function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'createCustomer' | 'createCheckout'>('createCustomer');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const customerForm = useForm<CustomerFormSchemaType>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: '', cpfCnpj: '', phone: '', postalCode: '', addressNumber: '' },
  });

  const paymentForm = useForm<PaymentFormSchemaType>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { billingType: 'CREDIT_CARD' },
  });
  
  useEffect(() => {
    if(userProfile) {
        customerForm.reset({
            name: userProfile.displayName || '',
            cpfCnpj: userProfile.cpfCnpj || '',
            phone: userProfile.phone || '',
            postalCode: userProfile.postalCode || '',
            addressNumber: userProfile.addressNumber || '',
        });
    }
  }, [userProfile, customerForm]);

  const handleCreateCustomer = (values: CustomerFormSchemaType) => {
    if (!user?.email || !user.uid) {
      setError('Usuário não autenticado. Faça login novamente.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createAsaasCustomerAction({
        ...values,
        email: user.email!,
        userId: user.uid,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: 'Erro ao Salvar Cliente', description: result.error, variant: 'destructive' });
      } else if (result.customerId) {
        setCustomerId(result.customerId);
        setStep('createCheckout');
        toast({ title: 'Sucesso!', description: 'Seus dados foram salvos. Agora escolha o pagamento.' });
      }
    });
  };

  const handleCreateCheckout = (values: PaymentFormSchemaType) => {
      if (!user?.uid || !customerId || !plan || !cycle) {
          setError('Informações incompletas para gerar o pagamento. Tente novamente.');
          return;
      }
      setError(null);
      startTransition(async () => {
          const result = await createAsaasCheckoutAction({
              userId: user.uid,
              customerId,
              plan: plan as 'pro' | 'premium',
              cycle: cycle as 'monthly' | 'annual',
              billingType: values.billingType,
          });
          if (result.error) {
              setError(result.error);
              toast({ title: 'Erro ao Criar Pagamento', description: result.error, variant: 'destructive' });
          } else if (result.checkoutUrl) {
              window.location.href = result.checkoutUrl;
          }
      });
  }
  
  const priceMap = {
    pro: { monthly: 'R$50', annual: 'R$500' },
    premium: { monthly: 'R$90', annual: 'R$900' },
  };

  const getPrice = () => {
      if (plan && cycle && (plan === 'pro' || plan === 'premium') && (cycle === 'monthly' || cycle === 'annual')) {
          return priceMap[plan][cycle];
      }
      return 'R$0';
  }
  
  const FADE_IN_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finalizar Assinatura"
        description="Estamos quase lá! Siga os passos para ir para o pagamento."
      />
      <Card className="max-w-2xl mx-auto border-0 rounded-2xl shadow-primary-lg overflow-hidden">
        <CardHeader>
          <div className="text-center">
            <p className="text-muted-foreground">Você está assinando</p>
            <h2 className="text-2xl font-bold font-headline">Plano {plan} <span className="capitalize">({cycle})</span></h2>
            <p className="text-3xl font-bold mt-2">{getPrice()}</p>
          </div>
        </CardHeader>
        <CardContent>
            <AnimatePresence mode="wait">
                {step === 'createCustomer' && (
                    <motion.div key="customer-step" variants={FADE_IN_VARIANTS} initial="hidden" animate="show" exit="exit">
                        <Form {...customerForm}>
                        <form onSubmit={customerForm.handleSubmit(handleCreateCustomer)} className="space-y-6">
                            <h4 className="font-semibold pt-4 flex items-center gap-2"><User className="h-5 w-5 text-primary"/> Dados do Pagador</h4>
                            <div className="space-y-2">
                                <FormField control={customerForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={customerForm.control} name="cpfCnpj" render={({ field }) => ( <FormItem><FormLabel>CPF ou CNPJ</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={customerForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(47) 99999-9999" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={customerForm.control} name="postalCode" render={({ field }) => ( <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={customerForm.control} name="addressNumber" render={({ field }) => ( <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            <Button type="submit" disabled={isPending || isProfileLoading} className="w-full h-11">
                                {isPending || isProfileLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                                Salvar e Continuar
                            </Button>
                        </form>
                        </Form>
                    </motion.div>
                )}

                {step === 'createCheckout' && (
                    <motion.div key="payment-step" variants={FADE_IN_VARIANTS} initial="hidden" animate="show" exit="exit">
                        <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                            <h4 className="font-semibold text-sm mb-2 text-center">Cliente Criado com Sucesso!</h4>
                            <div className="text-xs text-muted-foreground space-y-1 text-center sm:text-left">
                               <p><strong>ID Usuário:</strong> <span className="font-mono">{user?.uid}</span></p>
                               <p><strong>ID Cliente Asaas:</strong> <span className="font-mono">{customerId}</span></p>
                            </div>
                        </div>
                        <Form {...paymentForm}>
                        <form onSubmit={paymentForm.handleSubmit(handleCreateCheckout)} className="space-y-6">
                            <FormField
                                control={paymentForm.control}
                                name="billingType"
                                render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="font-semibold">Forma de Pagamento</FormLabel>
                                    <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                        <FormItem><FormControl><RadioGroupItem value="CREDIT_CARD" id="cc" className="sr-only" /></FormControl><Label htmlFor="cc" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"><CreditCard className="mb-3 h-6 w-6" /> Cartão</Label></FormItem>
                                        <FormItem><FormControl><RadioGroupItem value="PIX" id="pix" className="sr-only" /></FormControl><Label htmlFor="pix" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"><Banknote className="mb-3 h-6 w-6" /> PIX</Label></FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                             <Button type="submit" disabled={isPending} className="w-full h-11">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                                Ir para o Pagamento
                            </Button>
                             <Button type="button" variant="ghost" onClick={() => setStep('createCustomer')} className="w-full">Voltar</Button>
                        </form>
                        </Form>
                    </motion.div>
                )}
            </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={ <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }>
            <CheckoutPageContent />
        </Suspense>
    )
}

