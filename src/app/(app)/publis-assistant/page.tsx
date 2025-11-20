'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Clapperboard, FileText, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getAiSuggestedVideoScriptsAction } from './actions';

const formSchema = z.object({
  productDescription: z
    .string()
    .min(10, 'A descrição do produto deve ter pelo menos 10 caracteres.'),
  brandDetails: z
    .string()
    .min(10, 'Os detalhes da marca devem ter pelo menos 10 caracteres.'),
  trendingTopic: z.string().optional(),
});

export default function PublisAssistantPage() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    getAiSuggestedVideoScriptsAction,
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productDescription: '',
      brandDetails: '',
      trendingTopic: '',
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const result = state?.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assistente Publis"
        description="Gere roteiros de vídeo e propostas para suas colaborações com marcas."
      />

      <Card className="shadow-none border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-lg">
            <Bot className="h-5 w-5 text-primary" />
            <span>Detalhes da Colaboração</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() =>
                form.trigger().then((isValid) => {
                  if (isValid) {
                    formAction(new FormData(form.control._fields._form.current));
                  }
                })
              )}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="productDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Produto</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: 'Um novo tênis de corrida feito com materiais reciclados, super leve e...'"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detalhes da Marca</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: 'Marca de moda sustentável, focada no público jovem e consciente...'"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="trendingTopic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integrar com Trend (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 'unboxing ASMR' ou 'trend da dança viral'"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                className="font-manrope w-full sm:w-auto h-11 px-8 rounded-full text-base"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Gerar Ativos
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-headline tracking-tight">
            Resultado da IA
          </h2>
          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está preparando seus ativos...
              </p>
            </div>
          ) : result ? (
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <InfoCard
                title="Roteiro de Vídeo Gerado"
                icon={Clapperboard}
                content={result.videoScript}
              />
              <InfoCard
                title="Rascunho da Proposta"
                icon={FileText}
                content={result.proposalDraft}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
}) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
          <Icon className="h-5 w-5 text-primary/80" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={content}
          className="h-80 bg-background/50 text-base leading-relaxed"
        />
      </CardContent>
    </Card>
  );
}
