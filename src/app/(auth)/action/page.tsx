
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  applyActionCode,
} from 'firebase/auth';
import { Loader2, KeyRound, CheckCircle, XCircle, ArrowLeft, ArrowUpRight, MailCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

type ActionCodeMode = 'resetPassword' | 'verifyEmail' | 'recoverEmail' | null;
type ViewState = 'loading' | 'invalid' | 'form' | 'success';

const passwordFormSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });


function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();

  const mode = searchParams.get('mode') as ActionCodeMode;
  const actionCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [email, setEmail] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);


  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });


  useEffect(() => {
    if (!mode || !actionCode) {
      setErrorMessage('Link inválido ou ausente. Parâmetros não encontrados.');
      setViewState('invalid');
      return;
    }

    const handleAction = async () => {
      try {
        const info = await checkActionCode(auth, actionCode);
        setEmail(info.data.email!);

        switch (mode) {
          case 'resetPassword':
            setViewState('form');
            break;
          case 'verifyEmail':
            await applyActionCode(auth, actionCode);
            setSuccessMessage(`O e-mail ${info.data.email} foi verificado com sucesso!`);
            setViewState('success');
            break;
          default:
            setErrorMessage(`Ação '${mode}' não suportada.`);
            setViewState('invalid');
        }
      } catch (error: any) {
        let userFriendlyError = 'O link é inválido ou expirou. Por favor, tente novamente.';
        if (error.code === 'auth/expired-action-code') {
          userFriendlyError = 'Este link de ação expirou. Por favor, solicite um novo.';
        } else if (error.code === 'auth/invalid-action-code') {
           userFriendlyError = 'O link utilizado é inválido. Verifique se copiou o link completo ou tente solicitar um novo.';
        }
        setErrorMessage(userFriendlyError);
        setViewState('invalid');
      }
    };

    handleAction();
  }, [mode, actionCode, auth, router, toast]);

  async function handlePasswordReset(values: z.infer<typeof passwordFormSchema>) {
    if (!actionCode) return;
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, actionCode, values.password);
      setSuccessMessage('Sua senha foi redefinida com sucesso!');
      setViewState('success');
    } catch (error: any) {
       toast({
        title: 'Erro ao Redefinir Senha',
        description: 'Ocorreu um erro. O link pode ter expirado. Tente novamente.',
        variant: 'destructive',
      });
       setIsSubmitting(false);
    }
  }


  const renderContent = () => {
    switch (viewState) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground">Verificando seu link...</p>
          </div>
        );
      case 'invalid':
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="font-semibold">Link Inválido ou Expirado</p>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o Login
              </Link>
            </Button>
          </div>
        );
      case 'success':
        return (
          <div className="text-center space-y-4">
            {mode === 'verifyEmail' 
              ? <MailCheck className="h-12 w-12 text-green-500 mx-auto" />
              : <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            }
            <p className="font-semibold">{successMessage}</p>
            <p className="text-muted-foreground">
              Você já pode acessar sua conta.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Ir para o Login</Link>
            </Button>
          </div>
        );
      case 'form':
        if (mode === 'resetPassword') {
          return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-6">
                  <p className="text-sm text-center text-muted-foreground">
                    Redefinindo senha para <strong>{email}</strong>
                  </p>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                           <Input placeholder="••••••••" type="password" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirme a Nova Senha</FormLabel>
                        <FormControl>
                           <Input placeholder="••••••••" type="password" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Salvar Nova Senha
                  </Button>
                </form>
            </Form>
          );
        }
        return null;
    }
  };

  const { title, icon, description } = useMemo(() => {
    switch(mode) {
        case 'resetPassword': return {
            title: 'Redefinir sua Senha',
            icon: <KeyRound className="h-8 w-8 text-primary" />,
            description: 'Crie uma nova senha segura para sua conta.'
        };
        case 'verifyEmail': return {
            title: 'Verificação de E-mail',
            icon: <MailCheck className="h-8 w-8 text-primary" />,
            description: 'Finalizando a verificação do seu e-mail.'
        };
        default: return {
            title: 'Ação de Autenticação',
            icon: <KeyRound className="h-8 w-8 text-primary" />,
            description: ''
        }
    }
  }, [mode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="text-center mb-8">
            <Link
                href="/"
                className="flex justify-center items-center gap-2 text-3xl font-bold font-headline tracking-tighter text-foreground"
            >
                <div className="bg-foreground text-background h-8 w-8 flex items-center justify-center rounded-full">
                <ArrowUpRight className="h-5 w-5" />
                </div>
                trendify
            </Link>
        </div>
        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
          <CardHeader className="text-center">
             <div className="w-16 h-16 bg-primary/10 mx-auto rounded-full flex items-center justify-center border-2 border-primary/20 mb-4">
                {icon}
             </div>
            <CardTitle className="font-headline text-xl">
              {title}
            </CardTitle>
            <CardDescription>
                {viewState === 'form' && description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AuthActionHandler />
        </Suspense>
    )
}
