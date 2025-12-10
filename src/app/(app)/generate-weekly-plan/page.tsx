
'use client';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Loader2, Sparkles, Check, History, ClipboardList, BrainCircuit, Target, Eye, BarChart as BarChartIcon, Zap, AlertTriangle, Trophy, Save, Edit, Lightbulb, Trash2, PartyPopper, ArrowLeft } from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateWeeklyPlanAction, GenerateWeeklyPlanOutput, archiveAndClearWeeklyPlanAction } from '@/app/(app)/generate-weekly-plan/actions';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import type { UserProfile, PlanoSemanal, ItemRoteiro, IdeiaSalva } from '@/lib/types';
import {
  doc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PreviousPlansSheet } from '@/components/previous-plans-sheet';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogFooter, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogClose, ResponsiveDialogTrigger } from '@/components/ui/responsive-dialog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { DailyUsage } from '@/lib/types';
import { onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const formSchema = z.object({
  objective: z.string().min(1, 'O objetivo da semana é obrigatório.'),
  niche: z.string().min(1, 'Seu nicho é necessário.'),
  currentStats: z.string().min(1, 'Suas estatísticas são necessárias.'),
  totalFollowerGoal: z.number().optional(),
  instagramFollowerGoal: z.number().optional(),
  tiktokFollowerGoal: z.number().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = 'weekly-plan-result';


const chartConfig = {
  alcance: { label: 'Alcance', color: 'hsl(var(--primary))' },
  engajamento: { label: 'Engajamento', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;


const analysisCriteria = [
    {
        icon: BrainCircuit,
        title: "Estrategista de Crescimento",
        description: "A plataforma atua como uma estrategista, analisando seu nicho, estatísticas e objetivo para criar um plano de ação semanal focado em crescimento."
    },
    {
        icon: Target,
        title: "Tarefas Acionáveis",
        description: "Para cada dia da semana, definimos tarefas de conteúdo claras e práticas, com detalhes sobre o que fazer e como fazer."
    },
     {
        icon: BarChartIcon,
        title: "Simulação de Desempenho",
        description: "Com base nas tarefas, projetamos uma simulação realista de alcance e engajamento para você visualizar o impacto potencial do seu esforço."
    },
    {
        icon: Eye,
        title: "Foco no Objetivo",
        description: "Todo o plano, desde as tarefas diárias até a simulação, é construído com base no objetivo principal que você definiu para a semana."
    }
  ]


export default function GenerateWeeklyPlanPage() {
  const { toast } = useToast();
  const [isGenerating, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateWeeklyPlanOutput | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { subscription, isTrialActive } = useSubscription();
  const todayStr = new Date().toISOString().split('T')[0];
  
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
  const isPremium = subscription?.plan === 'premium';
  const isPro = subscription?.plan === 'pro';
  const hasReachedLimit = !isPremium && !isPro;


  useEffect(() => {
    // Check for a result to view from another page
    const itemToViewStr = localStorage.getItem('ai-result-to-view');
    if (itemToViewStr) {
      try {
        const item: IdeiaSalva = JSON.parse(itemToViewStr);
        if (item.origem === 'Plano Semanal' && item.aiResponseData) {
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

    // Fallback to locally stored result if no specific item is being viewed
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
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userProfileRef);

  const activePlanQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, `users/${user.uid}/weeklyPlans`), limit(1)) : null,
    [user, firestore]
  );
  const { data: activePlanData, isLoading: isLoadingActivePlan } = useCollection<PlanoSemanal>(activePlanQuery);
  const activePlan = activePlanData?.[0];
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'activePlan') {
        setActiveTab('activePlan');
        router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: '',
      niche: '',
      currentStats: '',
      totalFollowerGoal: 0,
      instagramFollowerGoal: 0,
      tiktokFollowerGoal: 0,
    },
  });
  
  const formAction = useCallback(async (formData: FormSchemaType) => {
    if (!user || !firestore) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    
    setIsFormOpen(false);
    startTransition(async () => {
        const actionResult = await generateWeeklyPlanAction(null, formData);
        if(actionResult?.error){
            toast({
                title: 'Erro ao Gerar Plano',
                description: actionResult.error,
                variant: 'destructive',
            });
        } else if (actionResult?.data) {
            setResult(actionResult.data);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actionResult.data));
            setActiveTab("result");
        }
    });
  }, [user, firestore, toast, startTransition]);
  
  const handleActivatePlan = useCallback(async () => {
    if (!result || !user || !firestore) return;
  
    startSavingTransition(async () => {
      try {
        const batch = writeBatch(firestore);
        const planCollectionRef = collection(firestore, `users/${user.uid}/weeklyPlans`);
        const ideasCollectionRef = collection(firestore, `users/${user.uid}/ideiasSalvas`);
  
        // Archive current active plans
        const oldPlansSnapshot = await getDocs(planCollectionRef);
        for (const planDoc of oldPlansSnapshot.docs) {
          const oldPlanData = planDoc.data() as PlanoSemanal;
          const newArchivedRef = doc(ideasCollectionRef); // Create a new doc ref for the archive
          
          if (oldPlanData.createdAt instanceof Timestamp) {
            batch.set(newArchivedRef, {
              userId: user.uid,
              titulo: `Plano Arquivado de ${oldPlanData.createdAt.toDate().toLocaleDateString('pt-BR')}`,
              conteudo: oldPlanData.items.map(item => `**${item.dia}:** ${item.tarefa}`).join('\n'),
              origem: "Plano Semanal",
              concluido: true, 
              createdAt: oldPlanData.createdAt,
              completedAt: serverTimestamp(),
              aiResponseData: oldPlanData,
            });
          }
          
          batch.delete(planDoc.ref);
        }
  
        // Add the new plan
        const newPlanDocRef = doc(planCollectionRef);
        const newPlanData: Omit<PlanoSemanal, 'id' | 'createdAt'> & { createdAt: any } = {
          userId: user.uid,
          createdAt: serverTimestamp(),
          items: result.items.map(item => ({ ...item, concluido: false })),
          desempenhoSimulado: result.desempenhoSimulado,
          effortLevel: result.effortLevel,
          priorityIndex: result.priorityIndex,
          realignmentTips: result.realignmentTips,
        };
        batch.set(newPlanDocRef, newPlanData);
        
        await batch.commit();
  
        toast({
          title: 'Sucesso!',
          description: 'Seu novo plano semanal foi ativado. O plano anterior foi arquivado.',
        });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setResult(null);
        setActiveTab('generate');
      } catch (e: any) {
        console.error('Erro ao salvar plano:', e);
        toast({
          title: 'Erro ao Salvar Plano',
          description: `Não foi possível salvar os dados: ${e.message}`,
          variant: 'destructive',
        });
      }
    });
  }, [result, user, firestore, toast, startSavingTransition, setActiveTab]);

  const handleDiscard = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setResult(null);
    setActiveTab("generate");
    toast({
        title: 'Resultado Descartado',
        description: 'Você pode gerar um novo plano agora.',
    });
  }

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

      const stats = [
        totalFollowers > 0 ? `${formatNumber(totalFollowers)} seguidores no total` : '',
        totalViews > 0 ? `${formatNumber(totalViews)} de média de views total` : '',
      ].filter(Boolean).join(', ');

      form.reset({
        objective: '',
        niche: userProfile.niche || '',
        currentStats: stats || 'Nenhuma métrica disponível',
        totalFollowerGoal: userProfile.totalFollowerGoal,
        instagramFollowerGoal: userProfile.instagramFollowerGoal,
        tiktokFollowerGoal: userProfile.tiktokFollowerGoal,
      });
    }
  }, [userProfile, form]);
  
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const handleToggleRoteiro = async (itemIndex: number) => {
    if (!firestore || !activePlan || !user) return;

    const planRef = doc(firestore, `users/${user.uid}/weeklyPlans`, activePlan.id);
    const updatedItems = activePlan.items.map((item, index) =>
      index === itemIndex ? { ...item, concluido: !item.concluido } : item
    );

    try {
      await updateDoc(planRef, { items: updatedItems });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar tarefa', description: e.message, variant: 'destructive' });
    }
  };
  
  const isButtonDisabled = isGenerating || isSaving || isLoadingProfile || hasReachedLimit;


  return (
    <div className="space-y-8">
      <PageHeader
        title="Plano Semanal"
        description="Transforme seu objetivo em um roteiro de conteúdo acionável."
      />
      
      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Montamos seu Plano?</h2>
            <p className="text-muted-foreground text-sm">A IA atua como sua estrategista e analisa 4 pilares:</p>
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
                                        <item.icon className="h-5 w-5 text-primary" />
                                        <span className="text-base font-semibold">{item.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-6">
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
                              <span className="text-sm font-semibold">{item.title}</span>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                          <p className="text-muted-foreground text-xs">{item.description}</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
        </div>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Gerar Novo Plano</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
           <TabsTrigger value="activePlan" disabled={!activePlan && !isLoadingActivePlan}>
            Plano Ativo
            {isLoadingActivePlan && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                     <h2 className="text-2xl font-bold font-headline">Defina o Briefing da Semana</h2>
                    <p className="text-muted-foreground max-w-xl text-sm">
                       Clique no botão abaixo para detalhar seu objetivo, nicho e métricas atuais. Isso ajuda a IA a criar um plano semanal mais preciso e eficaz.
                    </p>
                    <ResponsiveDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
                      <ResponsiveDialogTrigger asChild>
                         <Button size="lg" disabled={isButtonDisabled}>
                           {isGenerating || isSaving ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" />Gerar Plano</>
                            )}
                         </Button>
                      </ResponsiveDialogTrigger>
                       <ResponsiveDialogContent className="sm:max-w-2xl">
                            <ResponsiveDialogHeader>
                                <ResponsiveDialogTitle className="flex items-center justify-center gap-3 font-headline text-lg">
                                    <Bot className="h-6 w-6 text-primary" />
                                    <span>Briefing da Semana</span>
                                </ResponsiveDialogTitle>
                                <ResponsiveDialogDescription className='text-center'>
                                    Forneça os detalhes para um plano melhor. Sua meta de seguidores será usada para focar a estratégia.
                                </ResponsiveDialogDescription>
                            </ResponsiveDialogHeader>
                            <ScrollArea className="max-h-[calc(100vh-12rem)]">
                              <div className="p-6">
                                  <Form {...form}>
                                      <form onSubmit={form.handleSubmit(formAction)} className="space-y-6">
                                      <div className="space-y-6">
                                          <FormField
                                          control={form.control}
                                          name="objective"
                                          render={({ field }) => (
                                              <FormItem>
                                              <FormLabel>
                                                  Qual seu principal objetivo para a semana?
                                              </FormLabel>
                                              <FormControl>
                                                  <Input
                                                  placeholder="Ex: Aumentar o engajamento com Reels de humor"
                                                  className="h-11 bg-muted/50"
                                                  {...field}
                                                  />
                                              </FormControl>
                                              <FormMessage />
                                              </FormItem>
                                          )}
                                          />
                                          <div className="grid md:grid-cols-2 gap-x-6 gap-y-8">
                                          <FormField
                                              control={form.control}
                                              name="niche"
                                              render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel>Seu Nicho</FormLabel>
                                                  <FormControl>
                                                  {isLoadingProfile ? (
                                                      <Skeleton className="h-11 w-full" />
                                                  ) : (
                                                      <Input
                                                      placeholder="Defina em seu Perfil"
                                                      className="h-11 bg-muted/50"
                                                      {...field}
                                                      />
                                                  )}
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                              )}
                                          />
                                          <FormField
                                              control={form.control}
                                              name="currentStats"
                                              render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel>Métricas Atuais</FormLabel>
                                                  <FormControl>
                                                  {isLoadingProfile ? (
                                                      <Skeleton className="h-11 w-full" />
                                                  ) : (
                                                      <Input
                                                      placeholder="Defina em seu Perfil"
                                                      className="h-11 bg-muted/50"
                                                      {...field}
                                                      readOnly
                                                      />
                                                  )}
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
                            <ResponsiveDialogFooter className="p-6 pt-4 border-t">
                                <ResponsiveDialogClose asChild><Button type="button" variant="outline">Cancelar</Button></ResponsiveDialogClose>
                                <Button
                                    type="button"
                                    onClick={form.handleSubmit(formAction)}
                                    disabled={isButtonDisabled}
                                >
                                    {isGenerating || isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                    Gerar Plano
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
                    <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Plano Gerado</h2>
                    <p className="text-muted-foreground text-sm">Seu novo plano semanal está pronto. Ative-o para começar a usar.</p>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-8 animate-fade-in">
                      {isGenerating && !result ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="mt-4 text-muted-foreground">
                            Nossa IA está montando sua estratégia...
                          </p>
                        </div>
                      ) : result ? (
                        <>
                        <div className="md:hidden">
                            <Carousel>
                                <CarouselContent className="-ml-4">
                                    <CarouselItem className="pl-4 basis-[90%]">
                                         <Card className="shadow-primary-lg h-full">
                                            <CardHeader>
                                            <CardTitle className="text-center font-headline text-lg">
                                                Novo Roteiro de Conteúdo
                                            </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {result.items.map((item: ItemRoteiro, index: number) => (
                                                    <li key={index}>
                                                        <div className="flex items-start gap-4 p-2 rounded-lg">
                                                        <div className='h-5 w-5 mt-1 flex items-center justify-center shrink-0'>
                                                            <Check className='h-4 w-4 text-primary' />
                                                        </div>
                                                        <div className='flex-1'>
                                                            <p className={'font-medium text-sm text-foreground'}>
                                                            <span className="font-semibold text-primary">
                                                                {item.dia}:
                                                            </span>{' '}
                                                            {item.tarefa}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                            {item.detalhes}
                                                            </p>
                                                        </div>
                                                        </div>
                                                        {index < result.items.length - 1 && (
                                                        <Separator className="my-2" />
                                                        )}
                                                    </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                    <CarouselItem className="pl-4 basis-[90%]">
                                         <Card className="shadow-primary-lg h-full">
                                            <CardHeader>
                                            <CardTitle className="text-center font-headline text-lg">
                                                Nova Simulação de Desempenho
                                            </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pl-0 sm:pl-2">
                                                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                                    <BarChart accessibilityLayer data={result.desempenhoSimulado} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                                        <CartesianGrid vertical={false} />
                                                        <XAxis dataKey="data" tickLine={false} axisLine={false} />
                                                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                                                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                                        <Bar dataKey="alcance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="engajamento" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ChartContainer>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                     <CarouselItem className="pl-4 basis-[90%]">
                                        <Card className="shadow-primary-lg h-full">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-base"><Trophy className='h-5 w-5' /> Índice de Prioridade</CardTitle></CardHeader>
                                            <CardContent><ul className="space-y-2 text-sm text-center">{result.priorityIndex.map(item => <li key={item} className='font-semibold'>{item}</li>)}</ul></CardContent>
                                        </Card>
                                     </CarouselItem>
                                     <CarouselItem className="pl-4 basis-[90%]">
                                        <Card className="shadow-primary-lg h-full">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-base"><Zap className='h-5 w-5' /> Nível de Esforço</CardTitle></CardHeader>
                                            <CardContent><p className='text-2xl font-bold text-center'>{result.effortLevel}</p></CardContent>
                                        </Card>
                                     </CarouselItem>
                                      <CarouselItem className="pl-4 basis-[90%]">
                                        <Card className="shadow-primary-lg h-full">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-base"><AlertTriangle className='h-5 w-5' /> Dicas de Realinhamento</CardTitle></CardHeader>
                                            <CardContent><p className='text-sm text-center'>{result.realignmentTips}</p></CardContent>
                                        </Card>
                                     </CarouselItem>
                                </CarouselContent>
                            </Carousel>
                        </div>

                        <div className="hidden md:block space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                            <Card className="shadow-primary-lg">
                                <CardHeader>
                                <CardTitle className="text-center font-headline text-lg">
                                    Novo Roteiro de Conteúdo
                                </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {result.items.map((item: ItemRoteiro, index: number) => (
                                        <li key={index}>
                                            <div className="flex items-start gap-4 p-2 rounded-lg">
                                            <div className='h-5 w-5 mt-1 flex items-center justify-center shrink-0'>
                                                <Check className='h-4 w-4 text-primary' />
                                            </div>
                                            <div className='flex-1'>
                                                <p className={'font-medium text-sm text-foreground'}>
                                                <span className="font-semibold text-primary">
                                                    {item.dia}:
                                                </span>{' '}
                                                {item.tarefa}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                {item.detalhes}
                                                </p>
                                            </div>
                                            </div>
                                            {index < result.items.length - 1 && (
                                            <Separator className="my-2" />
                                            )}
                                        </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            <div className='space-y-8'>
                            <Card className="shadow-primary-lg">
                                <CardHeader>
                                <CardTitle className="text-center font-headline text-lg">
                                    Nova Simulação de Desempenho
                                </CardTitle>
                                </CardHeader>
                                <CardContent className="pl-0 sm:pl-2">
                                <ChartContainer
                                    config={chartConfig}
                                    className="h-[250px] w-full"
                                >
                                    <BarChart
                                        accessibilityLayer
                                        data={result.desempenhoSimulado}
                                        margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                                    >
                                        <CartesianGrid vertical={false} />

                                        <XAxis
                                        dataKey="data"
                                        tickLine={false}
                                        axisLine={false}
                                        />

                                        <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) =>
                                            typeof value === 'number' && value >= 1000
                                            ? `${value / 1000}k`
                                            : value
                                        }
                                        />

                                        <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                        />

                                        <Bar
                                        dataKey="alcance"
                                        fill="hsl(var(--primary))"
                                        radius={[4, 4, 0, 0]}
                                        />

                                        <Bar
                                        dataKey="engajamento"
                                        fill="hsl(var(--chart-2))"
                                        radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <Card className="shadow-primary-lg">
                                    <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><Trophy className='h-4 w-4' /> Índice de Prioridade</CardTitle></CardHeader>
                                    <CardContent><ul className="space-y-2 text-sm text-center">{result.priorityIndex.map(item => <li key={item} className='font-semibold'>{item}</li>)}</ul></CardContent>
                                </Card>
                                <Card className="shadow-primary-lg">
                                    <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><Zap className='h-4 w-4' /> Nível de Esforço</CardTitle></CardHeader>
                                    <CardContent><p className='text-lg font-bold text-center'>{result.effortLevel}</p></CardContent>
                                </Card>
                            </div>
                            <Card className="shadow-primary-lg">
                                    <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><AlertTriangle className='h-4 w-4' /> Dicas de Realinhamento</CardTitle></CardHeader>
                                    <CardContent><p className='text-sm text-center'>{result.realignmentTips}</p></CardContent>
                            </Card>
                            </div>
                            </div>
                        </div>

                            <div className='flex justify-center pt-4 gap-2'>
                                <Button onClick={handleActivatePlan} disabled={isSaving} className="w-full sm:w-auto">
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSaving ? 'Ativando...' : 'Ativar Plano'}
                                </Button>
                                <Button onClick={handleDiscard} variant="outline" className="w-full sm:w-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Descartar
                                </Button>
                            </div>
                        </>
                      ) : (
                         <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                          <ClipboardList className="h-10 w-10 text-muted-foreground" />
                          <p className="mt-4 text-muted-foreground">
                            Gere um plano para ver os resultados.
                          </p>
                        </div>
                      )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="activePlan">
            <Card className="rounded-t-none border-t-0 shadow-primary-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-center sm:text-left">
                        <div>
                            <CardTitle className="font-headline text-lg">Plano Semanal Ativo</CardTitle>
                            <CardDescription className='text-sm'>Este é o plano visível no seu dashboard.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <PreviousPlansSheet />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoadingActivePlan ? (
                         <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                     ) : activePlan ? (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                                <Card className="shadow-primary-lg">
                                    <CardHeader>
                                        <CardTitle className="font-headline text-lg">Roteiro de Conteúdo</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {activePlan.items.map((item: ItemRoteiro, index: number) => (
                                                <li key={index}>
                                                <div className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50">
                                                    <Checkbox
                                                    id={`active-roteiro-${index}`}
                                                    checked={item.concluido}
                                                    onCheckedChange={() => handleToggleRoteiro(index)}
                                                    className="h-5 w-5 mt-1"
                                                    />
                                                    <div className='flex-1'>
                                                    <label
                                                        htmlFor={`active-roteiro-${index}`}
                                                        className={cn(
                                                        'font-medium text-sm transition-colors cursor-pointer',
                                                        item.concluido ? 'line-through text-muted-foreground' : 'text-foreground'
                                                        )}
                                                    >
                                                        <span className="font-semibold text-primary">{item.dia}:</span> {item.tarefa}
                                                    </label>
                                                    <p className="text-xs text-muted-foreground">{item.detalhes}</p>
                                                    </div>
                                                </div>
                                                {index < activePlan.items.length - 1 && <Separator className="my-2" />}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <div className="space-y-8">
                                    <Card className="shadow-primary-lg">
                                        <CardHeader><CardTitle className="font-headline text-lg">Desempenho Simulado</CardTitle></CardHeader>
                                        <CardContent className="pl-0 sm:pl-2">
                                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                            <BarChart data={activePlan.desempenhoSimulado} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="data" tickLine={false} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="alcance" fill="var(--color-alcance)" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="engajamento" fill="var(--color-engajamento)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                     <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        <Card className="shadow-primary-lg">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><Trophy className='h-4 w-4' /> Índice de Prioridade</CardTitle></CardHeader>
                                            <CardContent><ul className="space-y-2 text-sm text-center">{activePlan.priorityIndex.map(item => <li key={item} className='font-semibold'>{item}</li>)}</ul></CardContent>
                                        </Card>
                                        <Card className="shadow-primary-lg">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><Zap className='h-4 w-4' /> Nível de Esforço</CardTitle></CardHeader>
                                            <CardContent><p className='text-lg font-bold text-center'>{activePlan.effortLevel}</p></CardContent>
                                        </Card>
                                    </div>
                                    <Card className="shadow-primary-lg">
                                            <CardHeader><CardTitle className="text-center flex items-center justify-center gap-2 text-xs text-muted-foreground"><AlertTriangle className='h-4 w-4' /> Dicas de Realinhamento</CardTitle></CardHeader>
                                            <CardContent><p className='text-sm text-center'>{activePlan.realignmentTips}</p></CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-64">
                            <ClipboardList className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">Nenhum plano ativo no momento.</p>
                            <p className="text-sm text-muted-foreground">Gere um novo plano e salve-o para ativá-lo.</p>
                        </div>
                     )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
