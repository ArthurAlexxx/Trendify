
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Newspaper,
  BrainCircuit,
  Target,
  Crown,
  Lightbulb,
  Briefcase,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generatePubliProposalsAction, GeneratePubliProposalsOutput } from '@/app/(app)/publis-assistant/actions';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format as formatDate } from 'date-fns';
import type { DailyUsage } from '@/lib/types';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';


const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  targetAudience: z.string().min(10, 'O público-alvo deve ter pelo menos 10 caracteres.'),
  differentiators: z.string().min(10, 'Os diferenciais devem ter pelo menos 10 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
  extraInfo: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

type PubliProposalsState = {
  data?: GeneratePubliProposalsOutput;
  error?: string;
} | null;


const analysisCriteria = [
    {
        icon: BrainCircuit,
        title: "Diretora Criativa",
        description: "Geração de 5 roteiros distintos, explorando diferentes ângulos de comunicação."
    },
    {
        icon: Target,
        title: "Foco em Conversão",
        description: "Roteiros com gancho, desenvolvimento e CTA alinhados ao seu objetivo."
    },
     {
        icon: Zap,
        title: "Adaptado para Trends",
        description: "Sugestões para adaptar as ideias para tendências e áudios em alta."
    },
    {
        icon: Check,
        title: "Checklist de Sucesso",
        description: "Checklist prático para maximizar a conversão dos seus vídeos."
    }
  ]



function PremiumFeatureGuard({ children }: { children: React.ReactNode }) {
    const { subscription, isLoading } = useSubscription();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const isPremiumActive = subscription?.plan === 'premium' && subscription.status === 'active';

    if (!isPremiumActive) {
        return (
             <AlertDialog open={true} onOpenChange={(open) => !open && router.push('/subscribe')}>
              <AlertDialogContent>
                 <AlertDialogHeader className="text-center items-center">
                  <div className="h-16 w-16 rounded-full bg-yellow-400/10 flex items-center justify-center mb-2 border-2 border-yellow-400/20">
                    <Crown className="h-8 w-8 text-yellow-500 animate-pulse" />
                  </div>
                  <AlertDialogTitle className="font-headline text-xl">Funcionalidade Premium</AlertDialogTitle>
                  <AlertDialogDescription>
                    O Assistente de Publis é um recurso exclusivo para assinantes Premium.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push('/subscribe')} className="w-full">Ver Planos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        );
    }

    return <>{children}</>;
}


export default function PublisAssistantPage() {
    return (
        <PremiumFeatureGuard>
            <PublisAssistantPageContent />
        </PremiumFeatureGuard>
    )
}


function PublisAssistantPageContent() {
  const { toast } = useToast();
  const [isGenerating, startTransition] = useTransition();
  const [state, setState] = useState<PubliProposalsState>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const { subscription, isTrialActive } = useSubscription();
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
  
  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    const usageDocRef = doc(firestore, `users/${user.uid}/dailyUsage/${todayStr}`);
    
    const unsubscribe = onSnapshot(usageDocRef, (doc) => {
        setUsageData(doc.exists() ? doc.data() as DailyUsage : null);
        setIsLoadingUsage(false);
    });

    return () => unsubscribe();
  }, [user, firestore, todayStr]);

  const generationsToday = usageData?.geracoesAI || 0;
  const hasReachedFreeLimit = isTrialActive && generationsToday >= 2;


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: 'Tênis de corrida da Nike',
      targetAudience: 'Corredores amadores que buscam conforto e performance, 25-40 anos.',
      differentiators: 'Tecnologia de amortecimento ZoomX, leveza e design feito com materiais reciclados.',
      objective: 'Gerar Vendas',
      extraInfo: 'Usar o cupom "CORRE15" para 15% de desconto.',
    },
  });
  
  const result = state?.data;

  const formAction = useCallback(async (formData: FormSchemaType) => {
    setIsFormOpen(false);
    startTransition(async () => {
      const result = await generatePubliProposalsAction(null, formData);
      setState(result);
      if (result?.data) {
        setActiveTab("result");
      }
    });
  }, [startTransition, setState, setActiveTab]);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Propostas',
        description: state.error,
        variant: 'destructive',
      });
    }
    if (result && user && firestore) {
      const usageDocRef = doc(firestore, `users/${user.uid}/dailyUsage/${todayStr}`);
      getDoc(usageDocRef).then(docSnap => {
          if (docSnap.exists()) {
              updateDoc(usageDocRef, { geracoesAI: increment(1) });
          } else {
              setDoc(usageDocRef, {
                  date: todayStr,
                  geracoesAI: 1,
                  videoAnalyses: 0,
              });
          }
      });
    }
  }, [state, result, toast, user, firestore, todayStr]);

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
        content += `**Variações com Trends:**\n- ${data.trendVariations.map(v => v.variacao).join('\n- ')}\n\n`;
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
          description: 'Sua campanha foi salva.',
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
  
  const isButtonDisabled = isGenerating || hasReachedFreeLimit;
  const isFreePlan = subscription?.plan === 'free';


  return (
    <div className="space-y-8">
      <PageHeader
        title="Assistente de Publis"
        description="Crie pacotes de conteúdo para marcas com foco em conversão."
        icon={Newspaper}
      >
        <SavedIdeasSheet />
      </PageHeader>

      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Criamos Sua Campanha?</h2>
            <p className="text-muted-foreground">A IA atua como sua diretora de criação, combinando estratégia e criatividade.</p>
        </div>
        <Separator className="w-1/2 mx-auto my-4" />
        <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}>
                    <CarouselContent className="-ml-4">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-full">
                                <Card className="h-full rounded-2xl border-0">
                                    <CardHeader className="items-center">
                                        <CardTitle className="text-center flex flex-col items-center gap-2">
                                            <item.icon className="h-5 w-5 text-primary" />
                                            <span className="text-base font-semibold">{item.title}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <p className="text-muted-foreground text-sm">{item.description}</p>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                </Carousel>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysisCriteria.map((item, index) => (
                    <Card key={index} className='rounded-2xl border-0'>
                        <CardHeader className="items-center">
                            <CardTitle className="text-center flex flex-col items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <span className="text-base font-semibold">{item.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-muted-foreground text-sm">{item.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Gerar Campanha</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
           <Card className="rounded-t-none border-t-0">
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <h2 className="text-2xl font-bold font-headline">Defina o Briefing da Campanha</h2>
                    <p className="text-muted-foreground max-w-xl">
                       Clique no botão abaixo para detalhar o produto, público e objetivo. Isso ajuda a IA a criar roteiros e estratégias mais eficazes.
                    </p>
                     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" disabled={isButtonDisabled}>
                                {isGenerating ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                                ) : (
                                    <><Edit className="mr-2 h-5 w-5" />Definir Briefing</>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                             <Card className="rounded-2xl border-0 shadow-none">
                                <CardHeader className="text-center">
                                <CardTitle className="flex items-center justify-center font-headline text-xl gap-2">
                                    <Bot className="h-6 w-6 text-primary" />
                                    Briefing da Campanha
                                </CardTitle>
                                <CardDescription>Quanto mais detalhes, mais alinhados à marca serão os roteiros.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                <Form {...form}>
                                    <form
                                    onSubmit={form.handleSubmit(formAction)}
                                    className="space-y-6"
                                    >
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-6">
                                            <FormField
                                            control={form.control}
                                            name="product"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Produto ou Marca</FormLabel>
                                                <FormControl>
                                                    <Input
                                                    placeholder="Ex: Tênis de corrida da Nike"
                                                    className="h-12 bg-muted/50"
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
                                                    <Textarea
                                                    placeholder="Ex: Mulheres de 25-35 anos, interessadas em vida saudável."
                                                    className="min-h-[120px] bg-muted/50"
                                                    {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                        </div>
                                        <div className="space-y-6">
                                            <FormField
                                            control={form.control}
                                            name="differentiators"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Diferenciais do Produto</FormLabel>
                                                <FormControl>
                                                <Textarea
                                                    placeholder="Ex: Material reciclado, leve, absorção de impacto, design moderno."
                                                    className="min-h-[120px] bg-muted/50"
                                                    {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                        </div>
                                    </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <FormField
                                        control={form.control}
                                        name="objective"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Objetivo Principal</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                                <FormControl>
                                                <SelectTrigger className="h-12 bg-muted/50">
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
                                        <FormField
                                            control={form.control}
                                            name="extraInfo"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Informações Adicionais (Opcional)</FormLabel>
                                                <FormControl>
                                                <Input
                                                    placeholder="Restrições, cupons, links, etc."
                                                    className="h-12 bg-muted/50"
                                                    {...field}
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-4">
                                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                        <Button
                                        type="submit"
                                        disabled={isButtonDisabled}
                                        className="w-full sm:w-auto"
                                        >
                                        {isGenerating ? (
                                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                                        ) : (
                                            <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote</>
                                        )}
                                        </Button>
                                    </div>
                                    </form>
                                </Form>
                                </CardContent>
                            </Card>
                        </DialogContent>
                    </Dialog>
                    {isFreePlan && (
                      <p className="text-sm text-muted-foreground text-center sm:text-left">
                        Você precisa de um plano <Link href="/subscribe" className='underline text-primary font-semibold'>Premium</Link> para usar esta ferramenta.
                      </p>
                    )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="result">
          <Card className="rounded-t-none border-t-0">
            <CardHeader className='text-center'>
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Pacote de Conteúdo Gerado</h2>
                <p className="text-muted-foreground">Ideias, roteiros e estratégias para a campanha.</p>
            </CardHeader>
             <CardContent className="p-6">
               {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                    {result && (
                      <div className='flex justify-center'>
                       <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Pacote
                      </Button>
                      </div>
                    )}

                  {isGenerating && !result ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">
                        Montando sua próxima campanha...
                      </p>
                    </div>
                  ) : result ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                      <div className="lg:col-span-2 space-y-6">
                        <Card className='rounded-2xl border-0'>
                            <CardHeader>
                                <CardTitle className="text-center flex items-center gap-3 text-lg font-semibold text-foreground">
                                    <Clapperboard className="h-5 w-5 text-primary" />
                                    <span>5 Roteiros Prontos para Gravar</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {result.scripts.map((script, index) => (
                                        <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger className="font-semibold text-base hover:no-underline text-left">Roteiro {index + 1}: {script.gancho}</AccordionTrigger>
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
                        
                         <Card className='rounded-2xl border-0'>
                            <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-primary" />Ângulos Criativos e Tom de Voz</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Ângulos para Campanha</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        {result.creativeAngles.map((angle, i) => <li key={i} className='flex items-start gap-2'><Sparkles className='h-4 w-4 text-primary shrink-0 mt-1' /><span>{angle}</span></li>)}
                                    </ul>
                                </div>
                                <div>
                                     <h4 className="font-semibold mb-2">Adaptações de Tom</h4>
                                      <div className="space-y-3">
                                        {result.brandToneAdaptations.map((adaptation, i) => (
                                            <p key={i} className="text-sm">
                                                <strong className='font-semibold text-foreground'>{adaptation.titulo}: </strong>
                                                <span className='text-muted-foreground'>{adaptation.texto}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                      </div>

                      <div className="space-y-8">
                         <Card className='rounded-2xl border-0'>
                             <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><Target className="h-5 w-5 text-primary" />Projeção de Conversão</CardTitle></CardHeader>
                             <CardContent className='space-y-1'>
                                <p className='font-semibold text-foreground'>{result.conversionProjection.roteiro}</p>
                                <p className='text-sm text-muted-foreground'>{result.conversionProjection.justificativa}</p>
                             </CardContent>
                         </Card>
                         <InfoListCard
                            title="Checklist de Conversão"
                            icon={Check}
                            items={result.conversionChecklist}
                         />
                         <InfoListCard
                            title="Variações com Trends"
                            icon={Zap}
                            items={result.trendVariations.map(v => v.variacao)}
                         />
                      </div>

                    </div>
                  ) : null}
                </div>
              )}
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
    <Card className="h-full rounded-2xl border-0">
      <CardHeader>
        <CardTitle className="text-center flex items-center gap-3 text-lg font-semibold text-foreground">
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
