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
  Captions,
  Clapperboard,
  Lightbulb,
  List,
  Loader2,
  Star,
  Sparkles,
  Link,
  Save,
} from 'lucide-react';
import { useEffect, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getVideoReviewAction, VideoReviewOutput } from './actions';
import { Badge } from '@/components/ui/badge';
import { salvarIdeiaAction } from '../salvar-ideia-action';

const formSchema = z.object({
  videoLink: z.string().url('Por favor, insira um URL de vídeo válido.'),
});

export default function VideoReviewPage() {
  const { toast } = useToast();
  const [state, formAction, isGenerating] = useActionState(
    getVideoReviewAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoLink: '',
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro na Análise',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const handleSave = (data: VideoReviewOutput) => {
    startSavingTransition(async () => {
      const title = `Análise de Vídeo: Score ${data.score}/100`;
      const content = `**Sugestões de Gancho:**\n- ${data.hookSuggestions.join('\n- ')}\n\n**Ritmo:**\n${data.pacingSuggestions}\n\n**Legenda:**\n${data.caption}`;
      const result = await salvarIdeiaAction({
        titulo: title,
        conteudo: content,
        origem: 'Análise de Vídeo',
      });
      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: 'Sua análise foi salva no painel.',
        });
      } else {
        toast({
          title: 'Erro ao Salvar',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  const result = state?.data;

  const scoreColor =
    result && result.score > 75
      ? 'text-green-500 bg-green-500/10 border-green-500/20'
      : result && result.score > 50
      ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      : 'text-red-500 bg-red-500/10 border-red-500/20';

  return (
    <div className="space-y-12">
      <PageHeader
        title="Análise de Vídeo com IA"
        description="Receba um diagnóstico completo e sugestões para viralizar seu vídeo."
      />

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Link className="h-6 w-6 text-primary" />
            <span>Cole o link do seu vídeo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => formAction(new FormData(form.control._formRef.current)))}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <FormField
                control={form.control}
                name="videoLink"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="sr-only">Link do Vídeo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.tiktok.com/seu-video-incrivel"
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isGenerating}
                size="lg"
                className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analisar Vídeo
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isGenerating || result) && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Diagnóstico da IA
              </h2>
              <p className="text-muted-foreground">
                Um diagnóstico completo para otimizar seu conteúdo.
              </p>
            </div>
            {result && (
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
                Salvar Análise
              </Button>
            )}
          </div>

          {isGenerating && !result ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                Analisando gancho, ritmo, áudio e mais...
              </p>
            </div>
          ) : result ? (
            <div className="grid gap-8">
              <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-primary" />
                      <span>Pontuação de Viralização</span>
                    </div>
                    <Badge
                      className={`text-xl font-bold rounded-lg px-4 py-1 border ${scoreColor}`}
                    >
                      {result.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground max-w-2xl">
                    Esta pontuação reflete o potencial de engajamento do seu
                    vídeo com base em mais de 50 fatores de sucesso, incluindo
                    tendências e melhores práticas atuais.
                  </p>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <InfoList
                  title="Sugestões de Gancho"
                  icon={Lightbulb}
                  items={result.hookSuggestions}
                />
                <InfoList
                  title="Variações de Roteiro"
                  icon={List}
                  items={result.scriptVariations}
                />
              </div>
              <InfoCard
                title="Sugestões de Ritmo"
                icon={Clapperboard}
                content={result.pacingSuggestions}
              />
              <InfoCard
                title="Legenda Otimizada"
                icon={Captions}
                content={result.caption}
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
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
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
          className="h-40 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}

function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
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
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-4 rounded-xl bg-background/50 border border-border/20"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
