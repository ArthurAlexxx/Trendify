
'use client';

import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);


export default function SignUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  useEffect(() => {
    setIsGooglePending(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          toast({
            title: 'Login com Google bem-sucedido!',
            description: 'Redirecionando para o painel...',
          });
          router.push('/dashboard');
        } else {
            setIsGooglePending(false);
        }
      })
      .catch((error) => {
        console.error("Google redirect result error", error);
        toast({
          title: 'Erro no login com Google',
          description: 'Não foi possível completar o login com o Google. Tente novamente.',
          variant: 'destructive',
        });
        setIsGooglePending(false);
      });
  }, [auth, router, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.name,
      });

      const userRef = doc(firestore, `users/${user.uid}`);
      await setDoc(userRef, {
        displayName: values.name,
        email: values.email,
        createdAt: serverTimestamp(),
        photoURL: user.photoURL,
        subscription: {
            status: 'inactive',
            plan: 'free',
        }
      }, { merge: true });
      
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Redirecionando para o painel...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign up error:', error.code, error.message);
      toast({
        title: 'Erro no cadastro',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'Este e-mail já está em uso.'
            : 'Ocorreu um erro ao criar sua conta. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {(isPending || isGooglePending) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
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
          <p className="text-muted-foreground mt-2">
            Crie sua conta e comece a crescer.
          </p>
        </div>
        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-xl">
              Cadastro gratuito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <Button variant="outline" className="w-full h-11" onClick={handleGoogleSignIn} disabled={isPending || isGooglePending}>
                    {isGooglePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    Entrar com Google
                </Button>

                <div className="flex items-center gap-4">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OU</span>
                    <Separator className="flex-1" />
                </div>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-center">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-center">Nome Completo</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu nome" {...field} className="h-11 bg-muted/30" />
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
                        <FormLabel className="text-center">E-mail</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="seu@email.com"
                            {...field}
                            type="email"
                            className="h-11 bg-muted/30"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-center">Senha</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="Crie uma senha forte"
                            {...field}
                            type="password"
                            className="h-11 bg-muted/30"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button
                    type="submit"
                    disabled={isPending || isGooglePending}
                    className="w-full font-manrope h-11 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                    >
                    {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar conta com E-mail
                    </Button>
                </form>
                </Form>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
