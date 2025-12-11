
'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowUpRight, ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const formSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true);
    setIsSuccess(false);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar E-mail',
        description:
          error.code === 'auth/user-not-found'
            ? 'Nenhuma conta encontrada com este e-mail.'
            : 'Ocorreu um erro. Tente novamente.',
      });
    } finally {
      setIsPending(false);
    }
  }

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
            <CardTitle className="font-headline text-xl">
              Redefinir Senha
            </CardTitle>
            <CardDescription>
                {isSuccess ? "Verifique sua caixa de entrada!" : "Insira seu e-mail para receber um link de redefinição."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
                <div className="text-center space-y-4">
                    <MailCheck className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-muted-foreground">
                        Um link para redefinir sua senha foi enviado para <strong>{form.getValues('email')}</strong>. Siga as instruções no e-mail.
                    </p>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Login
                        </Link>
                    </Button>
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="sr-only">E-mail</FormLabel>
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
                        <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full font-manrope h-11 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                        >
                        {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Enviar link para redefinir
                        </Button>
                    </form>
                </Form>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Lembrou a senha?{' '}
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
