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
});

export default function VideoIdeasPage() {
  const { toast } = useToast();
  const [state, formAction] = useActionState(generateVideoIdeasAction, null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      targetAudience: '',
      platform: 'tiktok',
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
        title="Gerador de Ideias de Vídeo com IA"
        description="Gere ideias de vídeos em alta com ganchos, roteiros e CTAs otimizados."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>Diga à IA o que você precisa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tópico</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex: 'rotina de skincare matinal'"
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
                      <FormLabel>Público-alvo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex: 'Geração Z com pele oleosa'"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="font-manrope w-full md:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Ideia'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <Card>
          <CardHeader>
            <CardTitle>Ideia de Vídeo Gerada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isPending && !result ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : result ? (
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <InfoCard
                    title="O Gancho"
                    icon={Mic}
                    content={result.gancho}
                  />
                  <InfoCard
                    title="Chamada para Ação (CTA)"
                    icon={Clapperboard}
                    content={result.cta}
                  />
                </div>
                <InfoCard
                  title="Roteiro do Vídeo"
                  icon={List}
                  content={result.script}
                  isTextarea
                />
                <InfoCard
                  title="Takes para Gravar"
                  icon={Clapperboard}
                  content={result.takes}
                  isTextarea
                />
                <div className="grid md:grid-cols-2 gap-6">
                  <InfoCard
                    title="Horário Sugerido para Postagem"
                    icon={Clock}
                    content={result.suggestedPostTime}
                  />
                  <InfoCard
                    title="Música em Alta"
                    icon={Disc}
                    content={result.trendingSong}
                  />
                </div>
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
      {isTextarea ? (
        <Textarea readOnly value={content} className="h-32 bg-background" />
      ) : (
        <p className="p-3 rounded-md border bg-background text-sm">
          {content}
        </p>
      )}
    </div>
  );
}
