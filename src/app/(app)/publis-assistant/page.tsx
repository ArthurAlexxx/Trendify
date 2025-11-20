
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
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bot,
  Check,
  Clapperboard,
  Loader2,
  Save,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generatePubliProposalsAction, GeneratePubliProposalsOutput } from './actions';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';


const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  tone: z.string().min(1, 'O tom de voz é obrigatório.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

export default function PublisAssistantPage() {
  const { toast } = useToast();
  const [state, formAction, isGenerating] = useActionState(
    generatePubliProposalsAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: '',
      tone: 'Autêntico e Confiável',
      objective: 'Gerar Vendas',
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Propostas',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const handleSave = (data: GeneratePubliProposalsOutput) => {
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
        const title = `Campanha: ${form.getValues('product').substring(0, 40)}...`;
        
        let content = `**Checklist de Conversão:**\n${data.conversionChecklist.map(item => `- ${item}`).join('\n')}\n\n`;
        content += `**Variações com Trends:**\n- ${data.trendVariations.join('\n- ')}\n\n`;
        content += `**Roteiros:**\n`;
        data.scripts.forEach((script, index) => {
          content += `\n**Roteiro ${index + 1}**\n`;
          content += `*Gancho:* ${script.gancho}\n`;
          content += `*Roteiro:* ${script.script}\n`;
          content += `*CTA:* ${script.cta}\n`;
        });


        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Propostas & Publis',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua campanha foi salva no painel.',
        });
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a campanha. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };
  
  const result = state?.data;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Assistente de Publis"
        description="Gere pacotes de conteúdo para suas parcerias com base em tendências e foco em conversão."
      >
        <SavedIdeasSheet />
      </PageHeader>

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Bot className="h-6 w-6 text-primary" />
            <span>Briefing da Campanha</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              action={formAction}
              onSubmit={form.handleSubmit(() => formAction(new FormData(form.control.formRef.current!)))}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto ou Marca</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 'Tênis de corrida da Nike'"
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
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tom de Voz</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Autêntico e Confiável">Autêntico e Confiável</SelectItem>
                          <SelectItem value="Divertido e Energético">Divertido e Energético</SelectItem>
                          <SelectItem value="Sofisticado e Premium">Sofisticado e Premium</SelectItem>
                           <SelectItem value="Educacional e Informativo">Educacional e Informativo</SelectItem>
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
                      <FormLabel>Objetivo Principal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="Gerar Vendas">Gerar Vendas (Conversão)</SelectItem>
                           <SelectItem value="Aumentar Reconhecimento da Marca">Aumentar Reconhecimento (Alcance)</SelectItem>
                           <SelectItem value="Gerar Leads">Gerar Leads (Cadastros)</SelectItem>
                           <SelectItem value="Engajar a Comunidade">Engajar a Comunidade</SelectItem>
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
                  disabled={isGenerating}
                  size="lg"
                  className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando Pacote...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote de Conteúdo</>
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
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Pacote de Conteúdo Gerado
              </h2>
              <p className="text-muted-foreground">
                Ideias, roteiros e estratégias para uma campanha de sucesso.
              </p>
            </div>
            {result && (
               <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Pacote
              </Button>
            )}
          </div>

          {isGenerating && !result ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está montando sua próxima campanha...
              </p>
            </div>
          ) : result ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

              {/* Scripts */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                            <Clapperboard className="h-5 w-5 text-primary" />
                            <span>5 Roteiros Prontos para Gravar</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {result.scripts.map((script, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="font-semibold text-base hover:no-underline">Roteiro {index + 1}: {script.gancho}</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                     <div>
                                        <h4 className='font-semibold text-foreground mb-1'>Roteiro:</h4>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{script.script}</p>
                                    </div>
                                    <div>
                                        <h4 className='font-semibold text-foreground mb-1'>Call to Action (CTA):</h4>
                                        <p className="text-muted-foreground">{script.cta}</p>
                                    </div>
                                </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
              </div>

              {/* Side Cards */}
              <div className="space-y-8">
                 <InfoListCard
                    title="Checklist de Conversão"
                    icon={Check}
                    items={result.conversionChecklist}
                 />
                 <InfoListCard
                    title="Variações com Trends"
                    icon={Zap}
                    items={result.trendVariations}
                 />
              </div>

            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InfoListCard({
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
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
                <Check className='h-4 w-4 text-primary mt-1 shrink-0' />
                <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

    