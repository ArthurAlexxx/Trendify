
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
import { Bot, Loader2, Sparkles, Check, History, ClipboardList, BrainCircuit, Target, Eye, BarChart as BarChartIcon, Zap, AlertTriangle, Trophy, Save } from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateWeeklyPlanAction, GenerateWeeklyPlanOutput } from '@/app/(app)/generate-weekly-plan/actions';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import type { UserProfile, PlanoSemanal, ItemRoteiro } from '@/lib/types';
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


const formSchema = z.object({
  objective: z.string().min(10, 'O objetivo precisa ser mais detalhado.'),
  niche: z.string().min(1, 'O nicho é obrigatório.'),
  currentStats: z.string().min(1, 'As estatísticas são obrigatórias.'),
  totalFollowerGoal: z.number().optional(),
  instagramFollowerGoal: z.number().optional(),
  tiktokFollowerGoal: z.number().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

type WeeklyPlanState = {
  data?: GenerateWeeklyPlanOutput;
  error?: string;
} | null;


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
  const [state, setState] = useState<WeeklyPlanState>(null);
  const [activeTab, setActiveTab] = useState("generate");
  
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userProfileRef);

  // Query to get the currently active plan (there should only be one)
  const activePlanQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, `users/${user.uid}/weeklyPlans`), limit(1)) : null,
    [user, firestore]
  );
  const { data: activePlanData, isLoading: isLoadingActivePlan } = useCollection<PlanoSemanal>(activePlanQuery);
  const activePlan = activePlanData?.[0];


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: 'Aumentar o engajamento em 15% com conteúdo de valor',
      niche: '',
      currentStats: '',
      totalFollowerGoal: 0,
      instagramFollowerGoal: 0,
      tiktokFollowerGoal: 0,
    },
  });
  
  const result = state?.data;

  const formAction = useCallback(async (formData: FormSchemaType) => {
    if (!user || !firestore) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    
    startTransition(async () => {
      const result = await generateWeeklyPlanAction(null, formData);
      setState(result);
      if(result?.data){
         setActiveTab("result");
      }
    });
  }, [user, firestore, toast, startTransition, setState, setActiveTab]);
  
  const handleSavePlan = useCallback(async () => {
    if (!result || !user || !firestore) return;
  
    startSavingTransition(async () => {
      try {
        const batch = writeBatch(firestore);
        const planCollectionRef = collection(firestore, `users/${user.uid}/weeklyPlans`);
        const ideasCollectionRef = collection(firestore, `users/${user.uid}/ideiasSalvas`);
  
        // 1. Archive the current active plan
        const oldPlansSnapshot = await getDocs(planCollectionRef);
        for (const planDoc of oldPlansSnapshot.docs) {
          const oldPlanData = planDoc.data() as PlanoSemanal;
          const newArchivedRef = doc(ideasCollectionRef);
          
          interface ArchivedPlan {
            userId: string;
            titulo: string;
            conteudo: string;
            origem: string;
            concluido: boolean;
            createdAt: any;
            fullPlanData: PlanoSemanal;
          }
          
          const archivedPlan: ArchivedPlan = {
            userId: user.uid,
            titulo: `Plano Arquivado em ${new Date().toLocaleDateString('pt-BR')}`,
            conteudo: oldPlanData.items.map(item => `**${item.dia}:** ${item.tarefa}\n*Detalhes:* ${item.detalhes}`).join('\n\n'),
            origem: "Plano Semanal",
            concluido: false, 
            createdAt: oldPlanData.createdAt,
            fullPlanData: oldPlanData,
          };
          
          batch.set(newArchivedRef, archivedPlan);
          batch.delete(planDoc.ref);
        }
  
        // 2. Save the new plan as the single active plan
        const newPlanDocRef = doc(planCollectionRef);
        
        const newPlanData: Omit<PlanoSemanal, 'id'> = {
          userId: user.uid,
          createdAt: serverTimestamp(),
          items: result.items.map(item => ({
            ...item,
            concluido: false
          })),
          desempenhoSimulado: result.desempenhoSimulado,
          effortLevel: result.effortLevel,
          priorityIndex: result.priorityIndex,
          realignmentTips: result.realignmentTips,
        };
        
        batch.set(newPlanDocRef, newPlanData);
        
        await batch.commit();
  
        toast({
          title: 'Sucesso!',
          description: 'Seu novo plano semanal foi salvo e ativado. O plano anterior foi movido para o histórico.',
        });
        setActiveTab('generate');
        setState(null);
      } catch (e: any) {
        console.error('Erro ao salvar plano:', e);
        toast({
          title: 'Erro ao Salvar Plano',
          description: `Não foi possível salvar os dados: ${e.message}`,
          variant: 'destructive',
        });
      }
    });
  }, [result, user, firestore, toast, startSavingTransition, setActiveTab, setState]);

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
        objective: form.getValues('objective') || 'Aumentar o engajamento em 15% com conteúdo de valor',
        niche: userProfile.niche || '',
        currentStats: stats || 'Nenhuma métrica disponível',
        totalFollowerGoal: userProfile.totalFollowerGoal,
        instagramFollowerGoal: userProfile.instagramFollowerGoal,
        tiktokFollowerGoal: userProfile.tiktokFollowerGoal,
      });
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Plano',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);
  
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


  return (
    <div className="space-y-8">
      <PageHeader
        title="Plano Semanal"
        description="Transforme seu objetivo em um roteiro de conteúdo acionável."
        icon={ClipboardList}
      />
      
      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Montamos seu Plano?</h2>
            <p className="text-muted-foreground">A IA atua como sua estrategista e analisa 4 pilares:</p>
        </div>
        <Separator className="w-1/2 mx-auto my-4" />
        <div className="py-8">
          <div className="md:hidden">
              <Carousel className="w-full" opts={{ align: 'start' }}>
                  <CarouselContent className="-ml-4">
                      {analysisCriteria.map((item, index) => (
                          <CarouselItem key={index} className="pl-4 basis-full">
                              <Card className="rounded-2xl border-0 h-full">
                                  <CardHeader>
                                      <CardTitle className="text-center flex items-center gap-3">
                                          <item.icon className="h-6 w-6 text-primary" />
                                          <span>{item.title}</span>
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <p className="text-muted-foreground">{item.description}</p>
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
                  <Card key={index} className="rounded-2xl border-0">
                      <CardHeader>
                          <CardTitle className="text-center flex items-center gap-3">
                              <item.icon className="h-6 w-6 text-primary" />
                              <span>{item.title}</span>
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-muted-foreground">{item.description}</p>
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
          <Card className="rounded-t-none border-t-0">
            <CardHeader>
              <CardTitle className="text-center flex items-center gap-3 font-headline text-xl">
                <Bot className="h-6 w-6 text-primary" />
                <span>Briefing da Semana</span>
              </CardTitle>
              <CardDescription className="text-center">
                Forneça os detalhes para um plano melhor. Sua meta de seguidores será usada para focar a estratégia.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(formAction)} className="space-y-8">
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
                                className="h-11"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="grid md:grid-cols-2 gap-6">
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
                                    className="h-11"
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
                                    className="h-11"
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

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-start gap-4">
                        <Button
                        type="submit"
                        disabled={isGenerating || isSaving || isLoadingProfile}
                        size="lg"
                        className="w-full sm:w-auto"
                        >
                        {isGenerating || isSaving ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {isSaving ? 'Salvando...' : 'Gerando...'}
                            </>
                        ) : (
                            <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Gerar Novo Plano
                            </>
                        )}
                        </Button>
                    </div>
                    </form>
                </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="result">
             <Card className="rounded-t-none border-t-0">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                        <div className="flex-1">
                          <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                            Plano Gerado
                          </h2>
                          <p className="text-muted-foreground">
                            Seu novo plano semanal está pronto. Salve-o para ativá-lo no seu dashboard.
                          </p>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                             <Button onClick={handleSavePlan} disabled={isSaving} className="w-full sm:w-auto">
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? 'Salvando...' : 'Salvar e Ativar Plano'}
                            </Button>
                        </div>
                    </div>
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
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                          <Card className="rounded-2xl border-0">
                            <CardHeader>
                              <CardTitle className="text-center font-headline text-xl">
                                Novo Roteiro de Conteúdo
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.items.map((item, index) => (
                                    <li key={index}>
                                        <div className="flex items-start gap-4 p-2 rounded-lg">
                                        <div className='h-5 w-5 mt-1 flex items-center justify-center shrink-0'>
                                            <Check className='h-4 w-4 text-primary' />
                                        </div>
                                        <div>
                                            <p className={'font-medium text-base text-foreground'}>
                                            <span className="font-semibold text-primary">
                                                {item.dia}:
                                            </span>{' '}
                                            {item.tarefa}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
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
                          <Card className="rounded-2xl border-0">
                            <CardHeader>
                              <CardTitle className="text-center font-headline text-xl">
                                Nova Simulação de Desempenho
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pl-0 sm:pl-2">
                               <ChartContainer
                                  config={chartConfig}
                                  className="h-[350px] w-full"
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
                            <Card className="border-0 rounded-2xl">
                                <CardHeader><CardTitle className="text-center flex items-center gap-2 text-sm text-muted-foreground"><Trophy className='h-4 w-4' /> Índice de Prioridade</CardTitle></CardHeader>
                                <CardContent><ul className="space-y-2 text-sm">{result.priorityIndex.map(item => <li key={item} className='font-semibold'>{item}</li>)}</ul></CardContent>
                            </Card>
                             <Card className="border-0 rounded-2xl">
                                <CardHeader><CardTitle className="text-center flex items-center gap-2 text-sm text-muted-foreground"><Zap className='h-4 w-4' /> Nível de Esforço</CardTitle></CardHeader>
                                <CardContent><p className='text-xl font-bold'>{result.effortLevel}</p></CardContent>
                            </Card>
                          </div>
                           <Card className="border-0 rounded-2xl">
                                <CardHeader><CardTitle className="text-center flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className='h-4 w-4' /> Dicas de Realinhamento</CardTitle></CardHeader>
                                <CardContent><p className='text-sm'>{result.realignmentTips}</p></CardContent>
                            </Card>
                          </div>
                        </div>
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
            <Card className="rounded-t-none border-t-0">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-center sm:text-left">
                        <div>
                            <CardTitle className="font-headline text-xl">Plano Semanal Ativo</CardTitle>
                            <CardDescription>Este é o plano visível no seu dashboard.</CardDescription>
                        </div>
                        <PreviousPlansSheet />
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoadingActivePlan ? (
                         <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                     ) : activePlan ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                             <Card className="rounded-2xl border-0">
                                <CardHeader>
                                <CardTitle className="font-headline text-xl">Roteiro de Conteúdo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {activePlan.items.map((item, index) => (
                                            <li key={index}>
                                            <div className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50">
                                                <Checkbox
                                                id={`active-roteiro-${index}`}
                                                checked={item.concluido}
                                                onCheckedChange={() => handleToggleRoteiro(index)}
                                                className="h-5 w-5 mt-1"
                                                />
                                                <div>
                                                <label
                                                    htmlFor={`active-roteiro-${index}`}
                                                    className={cn(
                                                    'font-medium text-base transition-colors cursor-pointer',
                                                    item.concluido ? 'line-through text-muted-foreground' : 'text-foreground'
                                                    )}
                                                >
                                                    <span className="font-semibold text-primary">{item.dia}:</span> {item.tarefa}
                                                </label>
                                                <p className="text-sm text-muted-foreground">{item.detalhes}</p>
                                                </div>
                                            </div>
                                            {index < activePlan.items.length - 1 && <Separator className="my-2" />}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                             <Card className="rounded-2xl border-0">
                                <CardHeader><CardTitle className="font-headline text-xl">Desempenho Semanal (Simulado)</CardTitle></CardHeader>
                                <CardContent className="pl-0 sm:pl-2">
                                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
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

    

    