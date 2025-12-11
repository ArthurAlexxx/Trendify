

'use client';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Sparkles,
  Loader2,
  Save,
  DollarSign,
  FileText,
  Lightbulb,
  Briefcase,
  BrainCircuit,
  Target,
  Crown,
  Handshake,
  AlignLeft,
  Edit,
  Trash2,
  Newspaper,
  BookMarked,
  Inbox,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useTransition, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getAiCareerPackageAction,
  AiCareerPackageOutput,
} from '@/app/(app)/media-kit/actions';
import { useNotification } from '@/hooks/use-notification';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, getDoc, setDoc, increment, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import type { UserProfile, DailyUsage, IdeiaSalva } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogFooter, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogClose, ResponsiveDialogTrigger } from '@/components/ui/responsive-dialog';
import { MediaKitResultView } from '@/components/media-kit/media-kit-result-view';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(1, 'As métricas não podem estar vazias.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = 'media-kit-result';
const ITEMS_PER_PAGE = 5;

const analysisCriteria = [
    {
        icon: BrainCircuit,
        title: "Gerente de Talentos",
        description: "A IA atua como sua gerente, usando suas métricas para criar um pacote de prospecção."
    },
    {
        icon: FileText,
        title: "Apresentação Impactante",
        description: "Cria um parágrafo de apresentação em primeira pessoa, focado em como você agrega valor."
    },
     {
        icon: DollarSign,
        title: "Preços Realistas",
        description: "Calculamos faixas de preço realistas com base nas suas métricas para suas negociações."
    },
    {
        icon: Lightbulb,
        title: "Ideias Criativas",
        description: "Gera ideias de colaboração autênticas e alinhadas ao seu nicho e à marca alvo."
    }
  ]



function PremiumFeatureGuard({ children }: { children: React.ReactNode }) {
    const { subscription, isLoading, isTrialActive } = useSubscription();
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
                    O Pacote de Prospecção é um recurso exclusivo para assinantes Premium.
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


export default function MediaKitPage() {
    return (
        <PremiumFeatureGuard>
            <MediaKitPageContent />
        </PremiumFeatureGuard>
    )
}


function MediaKitPageContent() {
  const { notify } = useNotification();
  const [isGenerating, startTransition] = useTransition();
  const [result, setResult] = useState<AiCareerPackageOutput | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const { subscription, isTrialActive } = useSubscription();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [viewingSavedItem, setViewingSavedItem] = useState<IdeiaSalva | null>(null);
  const [savedPage, setSavedPage] = useState(1);
  const [savedSearchTerm, setSavedSearchTerm] = useState('');


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
  const hasReachedLimit = !isPremium && !isTrialActive;


  useEffect(() => {
    // Check for a result to view from another page
    const itemToViewStr = localStorage.getItem('ai-result-to-view');
    if (itemToViewStr) {
      try {
        const item: IdeiaSalva = JSON.parse(itemToViewStr);
        if (item.origem === 'Mídia Kit & Prospecção' && item.aiResponseData) {
          setViewingSavedItem(item);
          setResult(item.aiResponseData);
          setActiveTab('result'); // Switch to result tab to show it
        }
      } catch (e) {
        console.error("Failed to parse item to view from localStorage", e);
      } finally {
        localStorage.removeItem('ai-result-to-view');
      }
      return; // Exit early if we are viewing a specific item
    }


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

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  
  const allSavedIdeasQuery = useMemoFirebase(() =>
    firestore && user ? query(
        collection(firestore, `users/${user.uid}/ideiasSalvas`),
        orderBy('createdAt', 'desc')
    ) : null,
  [firestore, user]);

  const { data: allSavedIdeas, isLoading: isLoadingSaved } = useCollection<IdeiaSalva>(allSavedIdeasQuery);

  const savedIdeas = useMemo(() => {
    if (!allSavedIdeas) return [];
    return allSavedIdeas
      .filter(idea => 
        idea.origem === 'Mídia Kit & Prospecção' &&
        idea.titulo.toLowerCase().includes(savedSearchTerm.toLowerCase())
      );
  }, [allSavedIdeas, savedSearchTerm]);
  
  const paginatedSavedIdeas = useMemo(() => {
    const startIndex = (savedPage - 1) * ITEMS_PER_PAGE;
    return savedIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [savedIdeas, savedPage]);

  const totalSavedPages = Math.ceil(savedIdeas.length / ITEMS_PER_PAGE);


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: '',
      keyMetrics: '',
      targetBrand: '',
    },
  });

  const formAction = useCallback(async (formData: FormSchemaType) => {
    setIsFormOpen(false);
    startTransition(async () => {
      setViewingSavedItem(null);
      const actionResult = await getAiCareerPackageAction(null, formData);
      if(actionResult?.error) {
          notify({
            title: 'Erro',
            description: actionResult.error,
            variant: 'destructive',
          });
      } else if (actionResult?.data) {
        setResult(actionResult.data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actionResult.data));
        setActiveTab("result");
      }
    });
  }, [startTransition, setActiveTab, notify]);

   useEffect(() => {
    if (userProfile) {
      const parseMetric = (value?: string | number): number => {
          if (typeof value === 'number') return value;
          if (!value || typeof value !== 'string') return 0;
          const cleanedValue = value.replace(/\./g, '').replace(',', '.');
          const num = parseFloat(cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6'));
          return isNaN(num) ? 0 : num;
      };

      const formatNumber = (num: number): string => {
          if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
          if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
          return String(num);
      };
      
      const totalFollowers = parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers);
      const totalViews = parseMetric(userProfile.instagramAverageViews) + parseMetric(userProfile.tiktokAverageViews);

      const metrics = [
        totalFollowers > 0 ? `${formatNumber(totalFollowers)} seguidores no total` : '',
        totalViews > 0 ? `${formatNumber(totalViews)} de média de views total` : '',
      ].filter(Boolean).join(', ');

      form.reset({
        niche: userProfile.niche || '',
        keyMetrics: metrics,
        targetBrand: '',
      });
    }
  }, [userProfile, form]);
  
  const watchedNiche = form.watch('niche');

  const debouncedNicheUpdate = useCallback(() => {
    if (userProfileRef && watchedNiche !== userProfile?.niche) {
      updateDoc(userProfileRef, { niche: watchedNiche });
    }
  }, [watchedNiche, userProfileRef, userProfile?.niche]);

  useEffect(() => {
    const handler = setTimeout(() => {
      debouncedNicheUpdate();
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [watchedNiche, debouncedNicheUpdate]);
  
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


  const handleSave = (data: AiCareerPackageOutput) => {
    if (!user || !firestore) {
      notify({
        title: 'Erro',
        description: 'Você precisa estar logado para salvar.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const targetBrand = form.getValues('targetBrand');
        const title = `Pacote de Prospecção para ${targetBrand}`;
        
        let content = `**Apresentação:**\n${data.executiveSummary}\n\n`;
        content += `**Tabela de Preços:**\n`;
        content += `- Reels: ${data.pricingTiers.reels || 'N/A'}\n`;
        content += `- Stories: ${data.pricingTiers.storySequence || 'N/A'}\n`;
        content += `- Post: ${data.pricingTiers.staticPost || 'N/A'}\n`;
        content += `- Pacote: ${data.pricingTiers.monthlyPackage || 'N/A'}\n\n`;
        content += `**Ideias de Colaboração:**\n${data.sampleCollaborationIdeas.map(idea => `- ${idea}`).join('\n')}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Mídia Kit & Prospecção',
          concluido: false,
          createdAt: serverTimestamp(),
          aiResponseData: { ...data, formValues: { ...form.getValues() } },
        });

        notify({
          title: 'Pacote Salvo!',
          description: 'Seu pacote de prospecção foi guardado nos Itens Salvos.',
        });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setResult(null);
        setViewingSavedItem(null);
        setActiveTab("generate");
      } catch (error) {
        console.error('Failed to save idea:', error);
        notify({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar o pacote. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };
  
  const handleDiscard = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setResult(null);
    setViewingSavedItem(null);
    setActiveTab("generate");
    notify({
        title: 'Resultado Descartado',
        description: 'Você pode gerar um novo pacote agora.',
    });
  }

  const isButtonDisabled = isGenerating || hasReachedLimit;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pacote de Prospecção"
        description="Gere propostas, preços e seu mídia kit profissional."
      />
      
      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Criamos seu Pacote?</h2>
            <p className="text-muted-foreground">A IA atua como sua gerente de talentos e foca em 4 pilares:</p>
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
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
          <TabsTrigger value="generate" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Gerar Pacote</TabsTrigger>
          <TabsTrigger value="result" disabled={!result} className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
           <TabsTrigger value="saved" disabled={!savedIdeas || savedIdeas.length === 0} className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">
            Salvos
            {isLoadingSaved && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
           <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardContent>
               <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <h2 className="text-2xl font-bold font-headline">Defina o Briefing de Prospecção</h2>
                    <p className="text-muted-foreground max-w-xl">
                       Clique no botão abaixo para definir o nicho, métricas e marca-alvo. Isso ajuda a IA a criar uma proposta mais alinhada e profissional.
                    </p>
                    <ResponsiveDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
                      <ResponsiveDialogTrigger asChild>
                         <Button size="lg" disabled={isButtonDisabled}>
                           {isGenerating ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote</>
                            )}
                         </Button>
                      </ResponsiveDialogTrigger>
                       <ResponsiveDialogContent className="sm:max-w-2xl p-0 flex flex-col gap-0">
                            <ResponsiveDialogHeader className="p-6 pb-4 border-b">
                                <ResponsiveDialogTitle className="flex items-center justify-center gap-3 font-headline text-xl">
                                    <Bot className="h-6 w-6 text-primary" />
                                    <span>Assistente de Carreira</span>
                                </ResponsiveDialogTitle>
                                <ResponsiveDialogDescription className='text-center'>Forneça os detalhes para a IA criar um pacote de prospecção completo.</ResponsiveDialogDescription>
                            </ResponsiveDialogHeader>
                            <ScrollArea className="flex-1">
                              <div className="p-6">
                                  <Form {...form}>
                                      <form
                                      onSubmit={form.handleSubmit(formAction)}
                                      className="space-y-6"
                                      >
                                      <div className="space-y-6">
                                          <FormField
                                          control={form.control}
                                          name="niche"
                                          render={({ field }) => (
                                              <FormItem>
                                              <FormLabel>Seu Nicho</FormLabel>
                                              <FormControl>
                                                  {isLoadingProfile ? <Skeleton className="h-12 w-full" /> : 
                                                  <Input
                                                      placeholder="Ex: Lifestyle e moda sustentável"
                                                      className="h-12 bg-muted/50"
                                                      {...field}
                                                  />
                                                  }
                                              </FormControl>
                                              <FormMessage />
                                              </FormItem>
                                          )}
                                          />
                                          <div className="grid md:grid-cols-2 gap-x-6 gap-y-8">
                                          <FormField
                                              control={form.control}
                                              name="keyMetrics"
                                              render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel>Métricas Chave</FormLabel>
                                                  <FormControl>
                                                  {isLoadingProfile ? <Skeleton className="h-12 w-full" /> :
                                                      <Input
                                                      placeholder="Ex: 250k seguidores, 15k views/vídeo"
                                                      className="h-12 bg-muted/50"
                                                      {...field}
                                                      readOnly
                                                      />
                                                  }
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                              )}
                                          />
                                          <FormField
                                              control={form.control}
                                              name="targetBrand"
                                              render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel>Marca Alvo</FormLabel>
                                                  <FormControl>
                                                  <Input
                                                      placeholder="Ex: Sallve, Natura, Nike"
                                                      className="h-12 bg-muted/50"
                                                      {...field}
                                                  />
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                              )}
                                          />
                                          </div>
                                      </div>
                                      </form>
                                  </Form>
                              </div>
                            </ScrollArea>
                            <ResponsiveDialogFooter className="p-6 border-t flex-col sm:flex-row gap-2">
                                <ResponsiveDialogClose asChild><Button type="button" variant="outline" className="w-full sm:w-auto">Cancelar</Button></ResponsiveDialogClose>
                                <Button
                                type="button"
                                onClick={form.handleSubmit(formAction)}
                                disabled={isButtonDisabled}
                                className="w-full sm:w-auto"
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
                    {!isPremium && !isTrialActive && (
                      <p className="text-sm text-muted-foreground text-center sm:text-left">
                        Você precisa de um plano <Link href="/subscribe" className='underline text-primary font-semibold'>Premium</Link> para usar esta ferramenta.
                      </p>
                    )}
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="result">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardHeader className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{viewingSavedItem ? viewingSavedItem.titulo : "Resultado Gerado"}</h2>
                <p className="text-muted-foreground">Um pacote completo para sua prospecção.</p>
            </CardHeader>
            <CardContent>
              {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                  {result && !viewingSavedItem && (
                      <div className='flex justify-center pt-4 gap-2'>
                         <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Pacote
                        </Button>
                        <Button onClick={handleDiscard} variant="outline" className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Descartar
                        </Button>
                      </div>
                    )}

                  {isGenerating && !result ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">Criando seu pacote...</p>
                    </div>
                  ) : result ? (
                     <MediaKitResultView result={result} formValues={form.getValues()} />
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="saved">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar pacotes salvos..."
                        className="pl-10 h-11"
                        value={savedSearchTerm}
                        onChange={(e) => {
                            setSavedSearchTerm(e.target.value);
                            setSavedPage(1); // Reset page on new search
                        }}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {viewingSavedItem ? (
                  <div>
                    <Button variant="ghost" onClick={() => setViewingSavedItem(null)} className="mb-4">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar para a lista
                    </Button>
                    <MediaKitResultView result={viewingSavedItem.aiResponseData} formValues={viewingSavedItem.aiResponseData.formValues} />
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <ul className="space-y-2">
                        {isLoadingSaved ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> 
                        : paginatedSavedIdeas && paginatedSavedIdeas.length > 0 ? (
                           paginatedSavedIdeas.map((idea) => (
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
                              <p className="text-muted-foreground">{savedSearchTerm ? "Nenhum pacote encontrado." : "Nenhum pacote salvo."}</p>
                           </div>
                        )}
                    </ul>
                     {totalSavedPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSavedPage(prev => Math.max(prev - 1, 1))}
                                disabled={savedPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Página {savedPage} de {totalSavedPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSavedPage(prev => Math.min(prev + 1, totalSavedPages))}
                                disabled={savedPage === totalSavedPages}
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                  </ScrollArea>
                )}
            </CardContent>
          </Card>
        </TabsContent>
       </Tabs>
    </div>
  );
}
