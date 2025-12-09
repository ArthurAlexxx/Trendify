
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  Check,
  Clock,
  Disc,
  Heart,
  Loader2,
  Mic,
  Pen,
  Save,
  Sparkles,
  Lightbulb,
  BrainCircuit,
  Target,
  Eye,
  BarChart as BarChartIcon,
  Youtube,
  Instagram,
  Clapperboard as TikTokIcon,
  TrendingUp,
  AlertTriangle,
  LightbulbIcon,
  Edit,
  Newspaper,
  Calendar,
  Trash2,
  BookMarked,
  Inbox,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateVideoIdeasAction, GenerateVideoIdeasOutput } from '@/app/(app)/video-ideas/actions';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, where, query, orderBy, setDoc, doc, increment, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import type { DailyUsage, IdeiaSalva, UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ObjectiveFormCard } from '@/components/ui/objective-form-card';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { VideoIdeasResultView } from './video-ideas-result-view';
import { ScrollArea } from '@/components/ui/scroll-area';


const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = 'video-ideas-result';


const analysisCriteria = [
    {
        icon: BrainCircuit,
        title: "Estrategista Viral",
        description: "Análise de nicho para gerar ideias com alto potencial de engajamento."
    },
    {
        icon: Target,
        title: "Gancho Magnético",
        description: "Criação de ganchos de 2-3 segundos para capturar a atenção imediatamente."
    },
     {
        icon: BarChartIcon,
        title: "Otimizado para Algoritmo",
        description: "Roteiros estruturados para reter a atenção e sugestões de músicas em alta."
    },
    {
        icon: Eye,
        title: "Foco no Objetivo",
        description: "Cada elemento, do roteiro ao CTA, é pensado para atingir seu objetivo."
    },
  ]




export default function VideoIdeasPage() {
  const { toast } = useToast();
  const [isGenerating, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateVideoIdeasOutput | null>(null);
  const [activeTab, setActiveTab] = useState("generate");

  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const { subscription, isTrialActive } = useSubscription();
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');

  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  useEffect(() => {
    if (!user || !firestore) return;
    const usageDocRef = doc(firestore, 'users', user.uid, 'dailyUsage', todayStr);
    
    const unsubscribe = onSnapshot(usageDocRef, (doc) => {
        setUsageData(doc.exists() ? doc.data() as DailyUsage : null);
        setIsLoadingUsage(false);
    });

    return () => unsubscribe();
  }, [user, firestore, todayStr]);
  
  const savedIdeasQuery = useMemoFirebase(() =>
    firestore && user ? query(
        collection(firestore, `users/${user.uid}/ideiasSalvas`),
        where('origem', '==', 'Ideias de Vídeo'),
        orderBy('createdAt', 'desc')
    ) : null,
  [firestore, user]);

  const { data: savedIdeas, isLoading: isLoadingSaved } = useCollection<IdeiaSalva>(savedIdeasQuery);


  const generationsToday = usageData?.geracoesAI || 0;
  const hasReachedFreeLimit = isTrialActive && generationsToday >= 2;


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      targetAudience: '',
      objective: 'Engajamento',
    },
  });
  
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      form.reset({
        topic: topicParam,
        targetAudience: userProfile?.audience || '',
        objective: form.getValues('objective'),
      })
      setIsFormOpen(true); 
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, form, router, pathname, userProfile]);


  const formAction = useCallback(async (formData: FormSchemaType) => {
    setIsFormOpen(false);
    startTransition(async () => {
      const actionResult = await generateVideoIdeasAction(null, formData);
       if (actionResult?.error) {
           toast({
                title: 'Erro ao Gerar Ideias',
                description: actionResult.error,
                variant: 'destructive',
            });
       } else if(actionResult?.data) {
        setResult(actionResult.data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actionResult.data));
        setActiveTab("result");
      }
    });
  }, [startTransition, setActiveTab, toast]);
  
  const completedIdeasQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            where('concluido', '==', true),
            orderBy('completedAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  
  const { data: completedIdeas, isLoading: isLoadingCompleted } = useCollection<IdeiaSalva>(completedIdeasQuery);

  useEffect(() => {
    if (userProfile && !searchParams.has('topic')) {
      form.reset({
        topic: '',
        targetAudience: userProfile.audience || '',
        objective: 'Engajamento',
      });
    }
  }, [userProfile, form, searchParams]);
  

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
  }, [result, firestore, user, todayStr]);

  const handleSave = (data: GenerateVideoIdeasOutput) => {
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
        const title = `Ideia: ${form.getValues('topic').substring(0, 40)}...`;
        const { gancho, scriptLongo, roteiroCurto, cta } = data.script;
        const content = `**Gancho:**\n${gancho}\n\n**Roteiro Longo:**\n${scriptLongo}\n\n**Roteiro Curto:**\n${roteiroCurto}\n\n**CTA:**\n${cta}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Ideias de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
          completedAt: null,
          aiResponseData: { ...data, formValues: form.getValues() },
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua ideia foi salva.',
        });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setResult(null);
        setActiveTab('generate');
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a ideia. Tente novamente.',
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
        description: 'Você pode gerar uma nova ideia agora.',
    });
  }

  const isButtonDisabled = isGenerating || hasReachedFreeLimit;
  const isFreePlan = subscription?.plan === 'free';


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerador de Vídeos Virais"
        description="Crie roteiros completos e otimizados para viralizar."
        icon={Lightbulb}
      />
      
      <div>
        <div className="text-center">
          <h2 className="text-xl font-bold font-headline">Como Criamos Suas Ideias?</h2>
          <p className="text-muted-foreground">A IA atua como uma estrategista de conteúdo viral e analisa 4 pilares:</p>
        </div>
        <Separator className="w-1/2 mx-auto my-4" />
        <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}>
                    <CarouselContent className="-ml-2 px-2">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-[90%]">
                                <div className='my-4 h-full'>
                                    <Card className="rounded-2xl border-0 h-full text-center shadow-primary-lg">
                                        <CardHeader className="items-center">
                                            <CardTitle className="flex flex-col items-center gap-3">
                                                <item.icon className="h-6 w-6 text-primary" />
                                                <span className="text-lg font-semibold">{item.title}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <p className="text-muted-foreground text-base">{item.description}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysisCriteria.map((item, index) => (
                    <Card key={index} className="rounded-2xl border-0 text-center shadow-primary-lg">
                        <CardHeader className="items-center">
                            <CardTitle className="flex flex-col items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <span className="text-base font-semibold">{item.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-6">
                            <p className="text-muted-foreground text-sm">{item.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Gerar Nova Ideia</TabsTrigger>
          <TabsTrigger value="result" disabled={!result && !isGenerating}>
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
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <h2 className="text-2xl font-bold font-headline">Defina seu Briefing</h2>
                    <p className="text-muted-foreground max-w-xl">
                        Clique no botão abaixo para definir o tópico, público-alvo e objetivo. Quanto mais detalhes, mais poderosa será a ideia gerada pela IA.
                    </p>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                         <Button size="lg" disabled={isButtonDisabled}>
                           {isGenerating ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" />Gerar Ideia</>
                            )}
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="p-0 bg-transparent border-none shadow-none w-full max-w-lg">
                        <ObjectiveFormCard
                          initialData={form.getValues()}
                          onSubmit={formAction}
                          onCancel={() => setIsFormOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                     {isFreePlan && (
                      <p className="text-sm text-muted-foreground text-center sm:text-left">
                        {isLoadingUsage ? <Skeleton className="h-4 w-32" /> : hasReachedFreeLimit 
                          ? 'Você atingiu seu limite de hoje.'
                          : `Gerações restantes hoje: ${2 - generationsToday}/2.`
                        }
                        {' '}
                        <Link href="/subscribe" className='underline text-primary font-semibold'>Faça upgrade para mais.</Link>
                      </p>
                    )}
                </div>
              </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="result">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
             <CardHeader className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado Gerado</h2>
                <p className="text-muted-foreground">Um plano de conteúdo completo para seu próximo vídeo.</p>
            </CardHeader>
             <CardContent>
              {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                  {result && (
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                        <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Salvar Ideia
                        </Button>
                        <Button onClick={handleDiscard} variant="outline" className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Descartar e Gerar Nova
                        </Button>
                         <Link href={`/content-calendar?title=${encodeURIComponent(form.getValues('topic'))}&notes=${encodeURIComponent(result.script.scriptLongo)}`}
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
                        Criando algo incrível para você...
                      </p>
                    </div>
                  ) : result ? (
                    <VideoIdeasResultView result={result} formValues={form.getValues()} />
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
                    <VideoIdeasResultView result={viewingSavedItem.aiResponseData} formValues={viewingSavedItem.aiResponseData.formValues} />
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
                              <p className="text-muted-foreground">Nenhuma ideia salva.</p>
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
