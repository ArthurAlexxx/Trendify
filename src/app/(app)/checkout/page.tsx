
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useTransition, useEffect, useMemo } from 'react';
import { Loader2, User, CreditCard, ExternalLink, Banknote, ClipboardCheck, Home, Hash } from 'lucide-react';
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
import { createAsaasCheckoutAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

const CheckoutFormSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.').max(18, 'O CPF/CNPJ é muito longo.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
});

type CheckoutFormSchemaType = z.infer<typeof CheckoutFormSchema>;


function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Parâmetros do plano vindos da URL
  const plan = searchParams.get('plan') as 'pro' | 'premium' | null;
  const cycle = searchParams.get('cycle') as 'monthly' | 'annual' | null;

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<CheckoutFormSchemaType>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      name: '',
      cpfCnpj: '',
      phone: '',
      postalCode: '',
      addressNumber: '',
      billingType: 'CREDIT_CARD',
    },
  });

  const selectedBillingType = form.watch('billingType');

  useEffect(() => {
    if(userProfile) {
        form.reset({
            name: userProfile.displayName || user?.displayName || '',
            cpfCnpj: userProfile.cpfCnpj || '',
            phone: userProfile.phone || '',
            postalCode: userProfile.postalCode || '',
            addressNumber: userProfile.addressNumber || '',
            billingType: 'CREDIT_CARD',
        });
    } else if (user) {
        form.reset({
            name: user.displayName || '',
            billingType: 'CREDIT_CARD',
        });
    }
  }, [userProfile, user, form]);


  useEffect(() => {
    if (!plan || !cycle) {
        toast({
            title: "Plano não especificado",
            description: "Por favor, selecione um plano antes de prosseguir.",
            variant: "destructive"
        });
        router.push('/subscribe');
    }
  }, [plan, cycle, router, toast]);

  const handleCreateCheckout = (values: CheckoutFormSchemaType) => {
      if (!user?.uid || !user.email || !plan || !cycle) {
          setError('Informações incompletas para gerar o pagamento. Tente novamente.');
          return;
      }
      setError(null);
      startTransition(async () => {
          const result = await createAsaasCheckoutAction({
              ...values,
              userId: user.uid,
              email: user.email!,
              plan,
              cycle,
          });
          if (result.error) {
              setError(result.error);
              toast({ title: 'Erro ao Criar Pagamento', description: result.error, variant: 'destructive' });
          } else if (result.checkoutUrl) {
              window.location.href = result.checkoutUrl;
          }
      });
  }
  
  const priceMap: Record<NonNullable<typeof plan>, Record<NonNullable<typeof cycle>, number>> = {
    pro: { monthly: 29.99, annual: 299.90 },
    premium: { monthly: 39.99, annual: 399.90 },
  };

  const getPrice = () => {
    if (plan && cycle) {
      return priceMap[plan][cycle];
    }
    return 0;
  };

  const FADE_IN_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } },
      }}
      className="space-y-8"
    >
      <motion.div variants={FADE_IN_VARIANTS}>
        <PageHeader
          title="Finalizar Assinatura"
          description="Estamos quase lá! Preencha seus dados para ir para o pagamento."
        />
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <motion.div variants={FADE_IN_VARIANTS} className="lg:col-span-3">
          <Card className="border-0 rounded-2xl shadow-primary-lg overflow-hidden">
            <CardContent className="p-6">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateCheckout)} className="space-y-8">
                    
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground"><User className="h-5 w-5 text-primary"/> Seus Dados</h3>
                        <div className="space-y-2">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="cpfCnpj" render={({ field }) => ( <FormItem><FormLabel>CPF ou CNPJ</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(47) 99999-9999" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground"><Home className="h-5 w-5 text-primary"/> Endereço de Cobrança</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="postalCode" render={({ field }) => ( <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="addressNumber" render={({ field }) => ( <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground"><CreditCard className="h-5 w-5 text-primary"/> Forma de Pagamento</h3>
                        <FormField
                            control={form.control}
                            name="billingType"
                            render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                                    <FormItem><FormControl><RadioGroupItem value="CREDIT_CARD" id="cc" className="sr-only" /></FormControl><Label htmlFor="cc" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"><CreditCard className="mb-3 h-6 w-6" /> Cartão de Crédito</Label></FormItem>
                                    <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="PIX" id="pix" className="sr-only" />
                                    </FormControl>
                                    <Label htmlFor="pix" className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary`}>
                                        <Banknote className="mb-3 h-6 w-6" /> PIX
                                    </Label>
                                    </FormItem>
                                </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </form>
                </Form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={FADE_IN_VARIANTS} className="lg:col-span-2">
            <Card className="rounded-2xl border-0 shadow-primary-lg sticky top-24">
                <CardHeader>
                    <CardTitle className="font-headline text-lg text-center">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Plano</p>
                        <p className="font-semibold text-foreground">Plano {plan} <span className="capitalize">({cycle === 'monthly' ? 'Mensal' : 'Anual'})</span></p>
                    </div>
                     <Separator />
                     <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold font-headline">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getPrice())}</span>
                     </div>
                     {error && <Alert variant="destructive" className="text-xs"><AlertDescription>{error}</AlertDescription></Alert>}
                     <Button onClick={form.handleSubmit(handleCreateCheckout)} disabled={isPending || isProfileLoading} className="w-full h-12 text-base">
                        {isPending || isProfileLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                        Ir para o Pagamento
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Ao continuar, você concorda com nossos <Link href="/terms-of-service" className="underline hover:text-primary">Termos de Serviço</Link>.</p>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={ <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }>
            <CheckoutPageContent />
        </Suspense>
    )
}
