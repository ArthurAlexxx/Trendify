
'use client';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
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
  Calendar,
  Trash2,
  BookMarked,
  Inbox,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generatePubliProposalsAction, GeneratePubliProposalsOutput } from '@/app/(app)/publis-assistant/actions';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment, getDoc, updateDoc, onSnapshot, query, orderBy, where, limit } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Textarea } from '@/components/ui/textarea';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyUsage, IdeiaSalva } from '@/lib/types';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ResponsiveDialog, ResponsiveDialogClose, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from '@/components/ui/responsive-dialog';
import { PublisAssistantResultView } from './publis-assistant-result-view';


const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  targetAudience: z.string().min(10, 'O público-alvo deve ter pelo menos 10 caracteres.'),
  differentiators: z.string().min(10, 'Os diferenciais devem ter pelo menos 10 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
  extraInfo: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = 'publis-assistant-result';


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
  const [result, setResult] = useState<GeneratePubliProposalsOutput | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();


  const { subscription, isTrialActive } = useSubscription();
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
  
  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [viewingSavedItem, setViewingSavedItem] = useState<IdeiaSalva | null>(null);


  useEffect(() => {
    const savedResult = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedResult) {
        try {
            setResult(JSON.parse(savedResult));
            setActiveTab('result');
        } catch (error) {
            console.error("Failed to parse saved result from localStorage", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }
  }, []);
  
  const savedIdeasQuery = useMemoFirebase(() =>
    firestore && user ? query(
        collection(firestore, `users/${user.uid}/ideiasSalvas`),
        where('origem', '==', 'Propostas & Publis'),
        orderBy('createdAt', 'desc')
    ) : null,
  [firestore, user]);

  const { data: savedIdeas, isLoading: isLoadingSaved } = useCollection<IdeiaSalva>(savedIdeasQuery);


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
  const isPremium = subscription?.plan === 'premium';
  const isPro = subscription?.plan === 'pro';
  const hasReachedLimit = !isPremium && !isPro;


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: '',
      targetAudience: '',
      differentiators: '',
      objective: 'Gerar Vendas',
      extraInfo: '',
    },
  });
  
 useEffect(() => {
    const product = searchParams.get('product');
    const differentiators = searchParams.get('differentiators');
    const targetAudience = searchParams.get('targetAudience');
    
    if (product || differentiators || targetAudience) {
      form.reset({
        product: product || '',
        differentiators: differentiators || '',
        targetAudience: targetAudience || '',
        objective: form.getValues('objective'),
        extraInfo: form.getValues('extraInfo'),
      });
      setIsFormOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, form, router, pathname]);



  const formAction = useCallback(async (formData: FormSchemaType) => {
    setIsFormOpen(false);
    startTransition(async () => {
      const actionResult = await generatePubliProposalsAction(null, formData);
      if(actionResult?.error) {
          toast({
            title: 'Erro ao Gerar Propostas',
            description: actionResult.error,
            variant: 'destructive',
          });
      } else if (actionResult?.data) {
        setResult(actionResult.data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actionResult.data));
        setActiveTab("result");
      }
    });
  }, [startTransition, setActiveTab, toast]);

  useEffect(() => {
    if (result && user && firestore) {
      const usageDocRef = doc(firestore, `users/${user.uid}/dailyUsage/${todayStr}`);
      getDoc(usageDocRef).then(docSnap => {
          if (docSnap.exists()) {
              updateDoc(docSnap.ref, { geracoesAI: increment(1) });
          } else {
              setDoc(usageDocRef, {
                  date: todayStr,
                  geracoesAI: 1,
                  videoAnalyses: 0,
              });
          }
      });
    }
  }, [result, user, firestore, todayStr]);

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
          aiResponseData: { ...data, formValues: form.getValues() },
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua campanha foi salva.',
        });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setResult(null);
        setActiveTab("generate");
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

  const handleDiscard = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setResult(null);
    setActiveTab("generate");
    toast({
        title: 'Resultado Descartado',
        description: 'Você pode gerar uma nova campanha agora.',
    });
  }
  
  const isButtonDisabled = isGenerating || hasReachedLimit;


  return (
    <div className="space-y-8">
      <PageHeader
        title="Assistente de Publis"
        description="Crie pacotes de conteúdo para marcas com foco em conversão."
      />

      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Criamos Sua Campanha?</h2>
            <p className="text-muted-foreground">A IA atua como sua diretora de criação, combinando estratégia e criatividade.</p>
        </div>
        <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}>
                    <CarouselContent className="-ml-4">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-[90%] pb-12">
                               <Card className="relative z-10 rounded-2xl border-0 h-full text-center shadow-primary-lg">
                                    <CardHeader className="items-center">
                                        <CardTitle className="flex flex-col items-center gap-3">
                                            <item.icon className="h-6 w-6 text-primary" />
                                            <span className="text-lg font-semibold">{item.title}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <p className="text-muted-foreground text-sm">{item.description}</p>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysisCriteria.map((item, index) => (
                    <Card key={index} className='rounded-2xl border-0 text-center shadow-primary-lg'>
                        <CardHeader className="items-center">
                            <CardTitle className="flex flex-col items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <span className="text-base font-semibold">{item.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-muted-foreground text-sm">{item.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Gerar Campanha</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="saved" disabled={!savedIdeas || savedIdeas.length === 0}>
            Salvos
            {isLoadingSaved && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
           <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <h2 className="text-2xl font-bold font-headline">Defina o Briefing da Campanha</h2>
                    <p className="text-muted-foreground max-w-xl">
                       Clique no botão abaixo para detalhar o produto, público e objetivo. Isso ajuda a IA a criar roteiros e estratégias mais eficazes.
                    </p>
                    <ResponsiveDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
                      <ResponsiveDialogTrigger asChild>
                         <Button size="lg" disabled={isButtonDisabled}>
                           {isGenerating ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" />Gerar Campanha</>
                            )}
                         </Button>
                      </ResponsiveDialogTrigger>
                      <ResponsiveDialogContent className="sm:max-w-2xl p-0 flex flex-col gap-0">
                        <ResponsiveDialogHeader className="p-6 pb-4 border-b">
                          <ResponsiveDialogTitle className="flex items-center justify-center font-headline text-xl gap-2">
                            <Bot className="h-6 w-6 text-primary" />
                            Briefing da Campanha
                          </ResponsiveDialogTitle>
                          <ResponsiveDialogDescription className='text-center'>Quanto mais detalhes, mais alinhados à marca serão os roteiros.</ResponsiveDialogDescription>
                        </ResponsiveDialogHeader>
                        <ScrollArea className="flex-1">
                          <div className="p-6">
                            <Form {...form}>
                                <form
                                onSubmit={form.handleSubmit(formAction)}
                                className="space-y-6"
                                >
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
                                            className="min-h-[100px] bg-muted/50"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="differentiators"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Diferenciais do Produto</FormLabel>
                                        <FormControl>
                                        <Textarea
                                            placeholder="Ex: Material reciclado, leve, absorção de impacto, design moderno."
                                            className="min-h-[100px] bg-muted/50"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                  />
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
                                
                                </form>
                            </Form>
                          </div>
                        </ScrollArea>
                         <ResponsiveDialogFooter className="p-6 pt-4 border-t">
                             <ResponsiveDialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                             </ResponsiveDialogClose>
                            <Button
                            type="button"
                            onClick={form.handleSubmit(formAction)}
                            disabled={isButtonDisabled}
                            >
                            {isGenerating ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                            ) : (
                                <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote</>
                            )}
                            </Button>
                        </ResponsiveDialogFooter>
                      </ResponsiveDialogContent>
                    </ResponsiveDialog>
                    {hasReachedLimit && (
                      <p className="text-sm text-muted-foreground text-center sm:text-left">
                        Você precisa de um plano <Link href="/subscribe" className='underline text-primary font-semibold'>Pro</Link> ou superior para usar esta ferramenta.
                      </p>
                    )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="result">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardHeader className='text-center'>
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Pacote de Conteúdo Gerado</h2>
                <p className="text-muted-foreground">Ideias, roteiros e estratégias para a campanha.</p>
            </CardHeader>
             <CardContent>
               {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                    {result && (
                       <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                         <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Campanha
                         </Button>
                          <Button onClick={handleDiscard} variant="outline" className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Descartar e Gerar Nova
                        </Button>
                         <Link href={`/content-calendar?title=${encodeURIComponent(form.getValues('product'))}&notes=${encodeURIComponent(result.scripts[0].script)}`}
                         className={cn(buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' }))}>
                           <Calendar className="mr-2 h-4 w-4" />
                           Agendar Post
                        </Link>
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
                    <PublisAssistantResultView result={result} formValues={form.getValues()} />
                  ) : null}
                </div>
              )}
             </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saved">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardContent className="pt-6">
                {viewingSavedItem ? (
                  <div>
                    <Button variant="ghost" onClick={() => setViewingSavedItem(null)} className="mb-4">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar para a lista
                    </Button>
                    <PublisAssistantResultView result={viewingSavedItem.aiResponseData} formValues={viewingSavedItem.aiResponseData.formValues} />
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <ul className="space-y-2">
                        {isLoadingSaved ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> 
                        : savedIdeas && savedIdeas.length > 0 ? (
                           savedIdeas.map((idea) => (
                             <li key={idea.id} className="p-3 rounded-lg border flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                                <div className="flex-1 overflow-hidden">
                                  <p className="font-semibold text-foreground truncate">{idea.titulo}</p>
                                  {idea.createdAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Salvo {formatDistanceToNow(idea.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setViewingSavedItem(idea)}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver
                                </Button>
                             </li>
                           ))
                        ) : (
                           <div className="text-center h-full flex flex-col items-center justify-center py-20">
                              <Inbox className="h-10 w-10 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">Nenhuma campanha salva.</p>
                           </div>
                        )}
                    </ul>
                  </ScrollArea>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
