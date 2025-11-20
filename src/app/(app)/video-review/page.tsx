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
} from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getVideoReviewAction } from './actions';

const formSchema = z.object({
  videoLink: z.string().url('Por favor, insira um URL de vídeo válido.'),
});

export default function VideoReviewPage() {
  const { toast } = useToast();
  const [state, formAction] = useActionState(getVideoReviewAction, null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoLink: '',
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
  const isPending = form.formState.isSubmitting;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Análise de Vídeo com IA"
        description="Receba uma pontuação e sugestões de melhoria para o seu vídeo."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>Envie seu vídeo para análise</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-4">
              <FormField
                control={form.control}
                name="videoLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link do Vídeo</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.tiktok.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isPending}
                className="font-manrope"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Analisar Vídeo'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Análise da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isPending && !result ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : result ? (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />{' '}
                      Pontuação Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <div className="relative h-20 w-20">
                      <svg className="h-full w-full" viewBox="0 0 36 36">
                        <path
                          className="text-border"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className="text-primary"
                          strokeDasharray={`${result.score}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">
                          {result.score}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground flex-1">
                      Esta pontuação reflete o potencial de engajamento com
                      base nas tendências e melhores práticas atuais.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
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
                  isTextarea
                />
                <InfoCard
                  title="Legenda Otimizada"
                  icon={Captions}
                  content={result.caption}
                  isTextarea
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  content,
  isTextarea = false,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  isTextarea?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <Textarea readOnly value={content} className="h-32 bg-background" />
    </div>
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <div className="p-3 rounded-md border bg-background space-y-2">
        {items.map((item, index) => (
          <p
            key={index}
            className="text-sm border-b border-border/50 pb-2 last:border-b-0 last:pb-0"
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
