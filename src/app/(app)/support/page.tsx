
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import { Hammer, Send } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const supportFormSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  subject: z
    .string()
    .min(5, 'O assunto precisa ter pelo menos 5 caracteres.'),
  message: z
    .string()
    .min(20, 'Sua mensagem precisa ter pelo menos 20 caracteres.'),
});

type SupportFormData = z.infer<typeof supportFormSchema>;

export default function SupportPage() {
  const { user, isUserLoading } = useUser();

  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || '',
        email: user.email || '',
        subject: '',
        message: '',
      });
    }
  }, [user, form]);

  const onSubmit = (data: SupportFormData) => {
    const mailtoLink = `mailto:artvaldivia2013@gmail.com?subject=${encodeURIComponent(
      data.subject
    )}&body=${encodeURIComponent(
      `Nome: ${data.name}\nE-mail: ${data.email}\n\nMensagem:\n${data.message}`
    )}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Suporte & Contato"
        description="Precisa de ajuda ou tem alguma sugestão? Preencha o formulário abaixo."
        icon={Hammer}
      />

      <Card className="max-w-2xl mx-auto border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-xl">
            Formulário de Contato
          </CardTitle>
          <CardDescription>
            Sua mensagem será aberta em seu aplicativo de e-mail para ser
            enviada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu Nome</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          className="bg-muted/50 h-11"
                        />
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
                      <FormLabel>Seu E-mail</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          className="bg-muted/50 h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Dúvida sobre o plano Premium"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sua Mensagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva sua dúvida ou sugestão em detalhes aqui..."
                        {...field}
                        className="min-h-[150px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isUserLoading}>
                  <Send className="mr-2 h-4 w-4" />
                  Abrir E-mail para Enviar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
