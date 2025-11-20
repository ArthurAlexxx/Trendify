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
import { Bot, Clapperboard, FileText, Loader2 } from 'lucide-react';
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
  const [state, formAction] = useActionState(
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
  const isPending = form.formState.isSubmitting;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Assistente Publis"
        description="Gere roteiros de vídeo e rascunhos de propostas personalizados para colaborações com marcas."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>Forneça detalhes da marca e do produto</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-6">
              <FormField
                control={form.control}
                name="productDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Produto</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o produto da marca em detalhes..."
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
                        placeholder="Informações sobre a marca, seus valores e público-alvo..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trendingTopic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tópico em Alta (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: 'unboxing ASMR'" {...field} />
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
                    Gerando...
                  </>
                ) : (
                  'Gerar Ativos da Proposta'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <Card>
          <CardHeader>
            <CardTitle>Ativos Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending && !result ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : result ? (
              <div className="grid md:grid-cols-2 gap-6">
                <InfoCard
                  title="Roteiro de Vídeo Gerado"
                  icon={Clapperboard}
                  content={result.videoScript}
                />
                <InfoCard
                  title="Rascunho da Proposta Gerado"
                  icon={FileText}
                  content={result.proposalDraft}
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
}: {
  title: string;
  icon: React.ElementType;
  content: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <Textarea readOnly value={content} className="h-64 bg-background" />
    </div>
  );
}
