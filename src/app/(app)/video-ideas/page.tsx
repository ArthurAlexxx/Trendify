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
  Camera,
  Clock,
  Disc,
  Heart,
  Loader2,
  Mic,
  Pen,
  Sparkles,
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
    <div className="space-y-12">
      <PageHeader
        title="Gerador de Ideias de Vídeo"
        description="Use a IA para criar conceitos de vídeo virais com roteiros e ganchos otimizados."
      />

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Descreva sua necessidade</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tópico Principal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 'Rotina de skincare para pele oleosa'"
                          className="h-11"
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
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                 <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plataforma</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        name={field.name}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
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
                        name={field.name}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
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
                        name={field.name}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
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
                        name={field.name}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
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

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isPending}
                  size="lg"
                  className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <div className="space-y-8 animate-fade-in">
           <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da IA</h2>
            <p className="text-muted-foreground">Aqui está um plano de conteúdo completo para seu próximo vídeo.</p>
           </div>

          {isPending && !result ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está criando algo incrível para você...
              </p>
            </div>
          ) : result ? (
            <div className="grid gap-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <InfoCard title="O Gancho Perfeito" icon={Mic} content={result.gancho} />
                <InfoCard title="Chamada para Ação (CTA)" icon={Heart} content={result.cta} />
              </div>
              <InfoCard title="Roteiro do Vídeo" icon={Pen} content={result.script} isTextarea />
              <InfoListCard title="Takes para Gravar" icon={Camera} content={result.takes} />
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
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary/80" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
      {isTextarea ? (
        <Textarea
          readOnly
          value={content}
          className="h-48 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
        />
      ) : (
        <p className="p-4 rounded-xl border border-border/10 bg-background/50 text-base text-foreground">
          {content}
        </p>
      )}
      </CardContent>
    </Card>
  );
}

function InfoListCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string[];
}) {
  return (
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary/80" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={content.map((take, index) => `${index + 1}. ${take}`).join('\n')}
          className="h-48 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}
