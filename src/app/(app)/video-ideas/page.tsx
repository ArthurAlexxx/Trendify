
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


export function VideoIdeasResultView({ result, formValues, isSheetView = false }: { result: any, formValues: FormSchemaType, isSheetView?: boolean }) {
    if (!result) return null;

    return (
        <div className={cn("space-y-8 animate-fade-in", !isSheetView && "p-6")}>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-none border-0">
                        <CardHeader>
                            <CardTitle className="text-center flex items-center gap-3 text-lg font-semibold text-foreground">
                                <Pen className="h-5 w-5 text-primary" />
                                <span>Roteiro do Vídeo</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible defaultValue='item-1' className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Roteiro Longo (45-60s)</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground whitespace-pre-wrap">{result.script.scriptLongo}</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Roteiro Curto (15-25s)</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground whitespace-pre-wrap">{result.script.scriptCurto}</AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card className="shadow-none border-0">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-primary" />Análise de Concorrência</CardTitle></CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {result.nicheCompetitors.map((item: any, index: number) => (
                                    <AccordionItem value={`comp-${index}`} key={index}>
                                        <AccordionTrigger className='text-left'>{item.videoTitle}</AccordionTrigger>
                                        <AccordionContent>
                                            <p className="font-semibold text-foreground mb-1">O que aprender:</p>
                                            <p className="text-sm text-muted-foreground">{item.learning}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                    <Card className="shadow-none border-0">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-primary" />Potencial de Viralização</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="text-5xl font-bold font-headline">{result.viralScore}</p>
                                <p className="text-sm text-muted-foreground">de 100</p>
                            </div>
                            <Progress value={result.viralScore} />
                        </CardContent>
                    </Card>

                    <div className='space-y-2'>
                        <InfoCard title="Gancho" icon={Mic} content={result.script.gancho} />
                        <InfoCard title="CTA" icon={Heart} content={result.script.cta} />
                        <InfoCard title="Horário Sugerido" icon={Clock} content={result.suggestedPostTime} />
                        <InfoCard title="Música em Alta" icon={Disc} content={result.trendingSong} />
                    </div>

                    {result.platformAdaptations && (result.platformAdaptations.tiktok || result.platformAdaptations.reels || result.platformAdaptations.shorts) && (
                        <Card className="shadow-none border-0">
                            <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><LightbulbIcon className="h-5 w-5 text-primary" />Adaptação para Plataformas</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {result.platformAdaptations.tiktok && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><TikTokIcon className="h-4 w-4" /> TikTok</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.tiktok}</p>
                                    </div>
                                )}
                                {result.platformAdaptations.reels && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><Instagram className="h-4 w-4" /> Reels</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.reels}</p>
                                    </div>
                                )}
                                {result.platformAdaptations.shorts && (
                                    <div>
                                        <h4 className='flex items-center gap-2 font-semibold mb-1'><Youtube className="h-4 w-4" /> Shorts</h4>
                                        <p className='text-sm text-muted-foreground'>{result.platformAdaptations.shorts}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-none border-0">
                        <CardHeader><CardTitle className="text-center flex items-center gap-3 text-lg font-semibold"><Camera className="h-5 w-5 text-primary" />Checklist de Gravação</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {result.takesChecklist.map((take: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                        <span>{take}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}



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

  useEffect(() => {
    try {
        const savedResult = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedResult) {
            setResult(JSON.parse(savedResult));
            setActiveTab('result');
        }
    } catch (error) {
        console.error("Failed to parse saved result from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
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
    const contextParam = searchParams.get('context');
    if (topicParam) {
      let fullTopic = topicParam;
      if (contextParam) {
        fullTopic += ` (Contexto: ${contextParam})`;
      }
      form.reset({
        topic: fullTopic,
        targetAudience: userProfile?.audience || '',
        objective: form.getValues('objective'),
      })
      setIsFormOpen(true); 
      // Clean the URL to prevent re-triggering
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
        const { gancho, scriptLongo, scriptCurto, cta } = data.script;
        const content = `**Gancho:**\n${gancho}\n\n**Roteiro Longo:**\n${scriptLongo}\n\n**Roteiro Curto:**\n${scriptCurto}\n\n**CTA:**\n${cta}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Ideias de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
          completedAt: null,
          aiResponseData: data,
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
      >
        <SavedIdeasSheet />
      </PageHeader>
      
      <div>
        <div className="text-center">
          <h2 className="text-xl font-bold font-headline">Como Criamos Suas Ideias?</h2>
          <p className="text-muted-foreground">A IA atua como uma estrategista de conteúdo viral e analisa 4 pilares:</p>
        </div>
        <Separator className="w-1/2 mx-auto my-4" />
        <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}>
                    <CarouselContent className="-ml-4">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-full">
                                <Card className="rounded-2xl border-0 h-full text-center">
                                    <CardHeader className="items-center">
                                        <CardTitle className="flex flex-col items-center gap-2">
                                            <item.icon className="h-5 w-5 text-primary" />
                                            <span className="text-base font-semibold">{item.title}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
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
                    <Card key={index} className="rounded-2xl border-0 text-center">
                        <CardHeader className="items-center">
                            <CardTitle className="flex flex-col items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <span className="text-base font-semibold">{item.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{item.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Gerar Nova Ideia</TabsTrigger>
          <TabsTrigger value="result" disabled={!result && !isGenerating}>
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
           <Card className="rounded-t-none border-t-0">
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
                          onSubmit={form.handleSubmit(formAction)}
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
          <Card className="rounded-t-none border-t-0">
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
      </Tabs>


      <Separator />

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
            Ideias Concluídas
          </h2>
          <p className="text-muted-foreground">
            Aqui estão as ideias que você já marcou como concluídas.
          </p>
        </div>
        <Card className="rounded-2xl border-0">
          <CardContent className='pt-6'>
            {isLoadingCompleted ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : completedIdeas && completedIdeas.length > 0 ? (
              <ul className="space-y-4">
                {completedIdeas.map((idea) => (
                  <li key={idea.id} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                        <Check className="h-5 w-5" />
                     </div>
                     <div className='flex-1'>
                        <p className="font-semibold text-foreground">{idea.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          Concluído {idea.completedAt ? formatDistanceToNow(idea.completedAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                        </p>
                     </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 px-4">
                 <p className="text-muted-foreground">Nenhuma tarefa concluída ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  content,
  className,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn("p-4 rounded-lg bg-muted/50 border", className)}
    >
        <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </h4>
          <p className="font-semibold text-foreground">
            {content}
          </p>
    </div>
  );
}
