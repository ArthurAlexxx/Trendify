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
    <div className="space-y-12">
      <PageHeader
        title="Assistente Publis"
        description="Gere roteiros de vídeo e propostas para suas colaborações com marcas."
      />

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Bot className="h-6 w-6 text-primary" />
            <span>Detalhes da Colaboração</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                <FormField
                  control={form.control}
                  name="productDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Produto</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: 'Um novo tênis de corrida feito com materiais reciclados, super leve e...'"
                          className="min-h-[140px] rounded-xl"
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
                          className="min-h-[140px] rounded-xl"
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
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  size="lg"
                  className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <div className="space-y-8 animate-fade-in">
           <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da IA</h2>
            <p className="text-muted-foreground">Conteúdo gerado para sua próxima colaboração de sucesso.</p>
           </div>
           
          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está preparando seus ativos...
              </p>
            </div>
          ) : result ? (
            <div className="grid lg:grid-cols-2 gap-8 items-start">
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
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={content}
          className="h-96 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}
