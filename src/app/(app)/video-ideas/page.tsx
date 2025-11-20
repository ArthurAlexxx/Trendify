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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  List,
  Bot,
  Clapperboard,
  Disc,
  Mic,
  Clock,
  Loader2,
  Sparkles,
  Camera,
  Heart,
  Target,
  Pen,
} from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateVideoIdeasAction } from './actions';

const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  platform: z.enum(['instagram', 'tiktok']),
  videoFormat: z.string().min(1, 'O formato é obrigatório.'),
  tone: z.string().min(1, 'O tom de voz é obrigatório.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

export default function VideoIdeasPage() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    generateVideoIdeasAction,
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      targetAudience: '',
      platform: 'tiktok',
      videoFormat: 'Tutorial',
      tone: 'Inspirador',
      objective: 'Engajamento',
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Ideias',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const result = state?.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerador de Ideias de Vídeo"
        description="Use a IA para criar conceitos de vídeo virais com roteiros e ganchos otimizados."
      />

      <Card className="shadow-none border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Descreva sua necessidade</span>
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
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tópico Principal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 'Rotina de skincare para pele oleosa'"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Público-Alvo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 'Mulheres de 25-35 anos interessadas em beleza'"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                 <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plataforma</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma plataforma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="videoFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato do Vídeo</FormLabel>
                       <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tutorial">Tutorial</SelectItem>
                          <SelectItem value="Unboxing">Unboxing</SelectItem>
                          <SelectItem value="Dança">Dança</SelectItem>
                          <SelectItem value="Storytelling">Storytelling</SelectItem>
                          <SelectItem value="Comédia">Comédia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tom de Voz</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Inspirador">Inspirador</SelectItem>
                          <SelectItem value="Engraçado">Engraçado</SelectItem>
                          <SelectItem value="Educacional">Educacional</SelectItem>
                          <SelectItem value="Luxuoso">Luxuoso</SelectItem>
                           <SelectItem value="Polêmico">Polêmico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo</FormLabel>
                       <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um objetivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Engajamento">Engajamento</SelectItem>
                          <SelectItem value="Alcance">Alcance</SelectItem>
                          <SelectItem value="Vendas">Vendas</SelectItem>
                          <SelectItem value="Educar">Educar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="font-manrope w-full sm:w-auto h-11 px-8 rounded-full text-base"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando Ideias...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Gerar Ideia
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold font-headline tracking-tight">Resultado da IA</h2>
          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está criando algo incrível para você...
              </p>
            </div>
          ) : result ? (
            <div className="grid gap-8">
              <div className="grid lg:grid-cols-2 gap-6">
                <InfoCard title="O Gancho Perfeito" icon={Mic} content={result.gancho} />
                <InfoCard title="Chamada para Ação (CTA)" icon={Heart} content={result.cta} />
              </div>
              <InfoCard title="Roteiro do Vídeo" icon={Pen} content={result.script} isTextarea />
              <InfoCard title="Takes para Gravar" icon={Camera} content={result.takes} isTextarea />
               <div className="grid lg:grid-cols-2 gap-6">
                <InfoCard title="Horário Sugerido" icon={Clock} content={result.suggestedPostTime} />
                <InfoCard title="Música em Alta" icon={Disc} content={result.trendingSong} />
              </div>
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
  isTextarea = false,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  isTextarea?: boolean;
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
      {isTextarea ? (
        <Textarea
          readOnly
          value={content}
          className="h-40 bg-background/50 text-base leading-relaxed"
        />
      ) : (
        <p className="p-4 rounded-lg border border-transparent bg-background/50 text-base text-foreground">
          {content}
        </p>
      )}
      </CardContent>
    </Card>
  );
}
