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
  Captions,
  Lightbulb,
  List,
  Loader2,
  Star,
  Sparkles,
  Link,
} from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getVideoReviewAction } from './actions';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  videoLink: z.string().url('Por favor, insira um URL de vídeo válido.'),
});

export default function VideoReviewPage() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    getVideoReviewAction,
    null
  );

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

  const result = state?.data;

  const scoreColor =
    result && result.score > 75
      ? 'text-green-500'
      : result && result.score > 50
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Análise de Vídeo com IA"
        description="Receba um diagnóstico completo e sugestões para viralizar seu vídeo."
      />

      <Card className="shadow-none border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-lg">
            <Link className="h-5 w-5 text-primary" />
            <span>Cole o link do seu vídeo</span>
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
                      />
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isPending}
                className="font-manrope w-full sm:w-auto h-10 px-6 text-base shrink-0"
              >
                {isPending ? (
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

      {(isPending || result) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-headline tracking-tight">
            Diagnóstico da IA
          </h2>
          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                Analisando gancho, ritmo, áudio e mais...
              </p>
            </div>
          ) : result ? (
            <div className="grid gap-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base font-semibold text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary/80" />
                      <span>Pontuação de Viralização</span>
                    </div>
                    <Badge variant="outline" className={`text-lg ${scoreColor}`}>
                      {result.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Esta pontuação reflete o potencial de engajamento do seu
                    vídeo com base em mais de 50 fatores de sucesso, incluindo
                    tendências e melhores práticas atuais.
                  </p>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6 items-start">
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
          className="h-32 bg-background/50 text-base leading-relaxed"
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
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
          <Icon className="h-5 w-5 text-primary/80" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-3 rounded-md bg-background/50 border border-border/50"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
