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
import {
  Bot,
  Clapperboard,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { useEffect, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  getAiSuggestedVideoScriptsAction,
  AiSuggestedVideoScriptsOutput,
} from './actions';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';

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
  const [state, formAction, isGenerating] = useActionState(
    getAiSuggestedVideoScriptsAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

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

  const handleSave = (data: AiSuggestedVideoScriptsOutput) => {
    if (!user || !firestore) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para salvar.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const title = `Proposta: ${form
          .getValues('brandDetails')
          .substring(0, 30)}...`;
        const content = `**Roteiro:**\n${data.videoScript}\n\n**Proposta:**\n${data.proposalDraft}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Assistente Publis',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua proposta foi salva no painel.',
        });
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a ideia. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const result = state?.data;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Assistente Publis"
        description="Gere roteiros de vídeo e propostas para suas colaborações com marcas."
      >
        <SavedIdeasSheet />
      </PageHeader>

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Bot className="h-6 w-6 text-primary" />
            <span>Detalhes da Colaboração</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => {
                const formData = new FormData();
                const values = form.getValues();
                formData.append('productDescription', values.productDescription);
                formData.append('brandDetails', values.brandDetails);
                formData.append('trendingTopic', values.trendingTopic || '');
                formAction(formData);
              })}
              className="space-y-8"
            >
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
                  disabled={isGenerating}
                  size="lg"
                  className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
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

      {(isGenerating || result) && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className='flex-1'>
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Resultado da IA
              </h2>
              <p className="text-muted-foreground">
                Conteúdo gerado para sua próxima colaboração de sucesso.
              </p>
            </div>
            {result && (
              <div className="flex w-full sm:w-auto gap-2">
                <Button
                  onClick={() => handleSave(result)}
                  disabled={isSaving}
                  className="w-full sm:w-auto rounded-full font-manrope"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Proposta
                </Button>
              </div>
            )}
          </div>

          {isGenerating && !result ? (
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
  className,
  contentClassName,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card
      className={`shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl h-full ${className}`}
    >
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
          className={`h-96 bg-background/50 text-base leading-relaxed resize-none rounded-xl ${contentClassName}`}
        />
      </CardContent>
    </Card>
  );
}
