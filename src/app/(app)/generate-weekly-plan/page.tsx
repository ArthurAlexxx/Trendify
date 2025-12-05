
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
import { Bot, Loader2, Sparkles, Trash2, Check, History, ClipboardList, BrainCircuit, Target, BarChart as BarChartIcon, Eye } from 'lucide-react';
import { useEffect, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateWeeklyPlanAction, GenerateWeeklyPlanOutput } from '@/app/(app)/generate-weekly-plan/actions';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import type { UserProfile, ItemRoteiro, PlanoSemanal } from '@/lib/types';
import {
  doc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PreviousPlansSheet } from '@/components/previous-plans-sheet';

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
        description: "Análise de nicho, estatísticas e objetivo para criar um plano de ação semanal."
    },
    {
        icon: Target,
        title: "Tarefas Acionáveis",
        description: "Para cada dia, definimos tarefas claras e práticas, com detalhes sobre o que fazer."
    },
     {
        icon: BarChartIcon,
        title: "Simulação de Desempenho",
        description: "Projeção de alcance e engajamento para visualizar o impacto potencial."
    },
    {
        icon: Eye,
        title: "Foco no Objetivo",
        description: "Todo o plano é construído com base no seu objetivo principal para a semana."
    }
  ]


export default function GenerateWeeklyPlanPage() {
  const { toast } = useToast();
  const [isGenerating, startTransition] = useTransition();
  const [state, setState] = useState<WeeklyPlanState>(null);
  
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userProfileRef);

  const roteiroQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'roteiro'), orderBy('createdAt', 'desc'), limit(1)) : null),
    [firestore]
  );
  const { data: roteiroData, isLoading: isLoadingRoteiro } = useCollection<PlanoSemanal>(roteiroQuery);
  const currentPlan = roteiroData?.[0];
  const currentRoteiroItems = currentPlan?.items;
  const currentDesempenho = currentPlan?.desempenhoSimulado;


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
  
  const formAction = async (formData: FormSchemaType) => {
    startTransition(async () => {
      const result = await generateWeeklyPlanAction(null, formData);
      setState(result);
    });
  };

  useEffect(() => {
    if (userProfile) {
       const stats = [
        userProfile.instagramFollowers ? `${userProfile.instagramFollowers} seguidores no Instagram` : '',
        userProfile.tiktokFollowers ? `${userProfile.tiktokFollowers} seguidores no TikTok` : '',
        userProfile.instagramAverageViews ? `${userProfile.instagramAverageViews} de média de views` : '',
      ].filter(Boolean).join(', ');

      form.reset({
        objective: form.getValues('objective') || '',
        niche: userProfile.niche || '',
        currentStats: stats,
        totalFollowerGoal: userProfile.totalFollowerGoal,
        instagramFollowerGoal: userProfile.instagramFollowerGoal,
        tiktokFollowerGoal: userProfile.tiktokFollowerGoal,
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


  const result = state?.data;

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Plano',
        description: state.error,
        variant: 'destructive',
      });
    }
    if (result && firestore) {
      startSavingTransition(async () => {
        try {
          await addDoc(collection(firestore, 'roteiro'), {
            items: result.roteiro,
            desempenhoSimulado: result.desempenhoSimulado,
            createdAt: serverTimestamp(),
          });

          toast({
            title: 'Sucesso!',
            description:
              'Seu novo roteiro foi salvo.',
          });
        } catch (e: any) {
          toast({
            title: 'Erro ao Salvar Plano',
            description: `Não foi possível salvar: ${e.message}`,
            variant: 'destructive',
          });
        }
      });
    }
  }, [state, result, firestore, toast]);

  const handleToggleRoteiro = async (item: ItemRoteiro) => {
    if (!firestore || !currentPlan) return;
    const planoRef = doc(firestore, 'roteiro', currentPlan.id);
    const updatedItems = currentRoteiroItems?.map((i) =>
      i.tarefa === item.tarefa ? { ...i, concluido: !i.concluido } : i
    );
    try {
      await updateDoc(planoRef, { items: updatedItems });
    } catch (error) {
      console.error('Failed to update roteiro status:', error);
    }
  };

  const handleDeleteCurrentPlan = async () => {
    if (!firestore || !currentPlan) {
      toast({ title: 'Nenhum plano para deletar.', variant: 'destructive'});
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'roteiro', currentPlan.id));
      toast({ title: 'Plano atual deletado com sucesso!'});
    } catch (error: any) {
      toast({ title: 'Erro ao deletar plano', description: error.message, variant: 'destructive'});
    }
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Plano Semanal"
        description="Transforme seu objetivo em um roteiro de conteúdo acionável."
        icon={ClipboardList}
      >
        <PreviousPlansSheet />
      </PageHeader>
      
        <Card className="border-0 rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Como Montamos seu Plano?
                </CardTitle>
                 <CardDescription>A IA atua como sua estrategista e analisa 4 pilares:</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {analysisCriteria.map((item, index) => (
                            <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                                <div className="flex items-center gap-3 mb-2">
                                    <item.icon className="h-5 w-5 text-primary" />
                                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>


      <Card className="border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Bot className="h-6 w-6 text-primary" />
            <span>Briefing da Semana</span>
          </CardTitle>
          <CardDescription>
            Forneça os detalhes para um plano melhor. Sua meta de seguidores será usada para focar a estratégia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6">
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

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
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
                    
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type='button' disabled={!currentPlan || isGenerating || isSaving} className="w-full sm:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Plano Atual
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá deletar o plano semanal atual. Ele não poderá ser recuperado.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCurrentPlan} className={cn(buttonVariants({variant: 'destructive'}))}>Deletar Plano</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>

                </div>
                </form>
            </Form>
          </div>
        </CardContent>
      </Card>
      
      {!result && isLoadingRoteiro && (
         <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <Card className="rounded-2xl border-0"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div></CardContent></Card>
              <Card className="rounded-2xl border-0"><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-[350px] w-full" /></CardContent></Card>
            </div>
          </div>
      )}

      {!result && !isLoadingRoteiro && currentRoteiroItems && currentRoteiroItems.length > 0 && (
         <div className="space-y-8 animate-fade-in">
           <Separator />
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Seu Plano Atual</h2>
              <p className="text-muted-foreground">Este é o roteiro que está ativo no seu painel.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <Card className="rounded-2xl border-0">
                  <CardHeader><CardTitle className="font-headline text-xl">Roteiro de Conteúdo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="p-6">
                        <ul className="space-y-2">
                        {currentRoteiroItems.map((item, index) => (
                            <li key={index}>
                            <div className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50">
                                <Checkbox
                                id={`current-roteiro-${index}`}
                                checked={item.concluido}
                                onCheckedChange={() => handleToggleRoteiro(item)}
                                className="h-5 w-5 mt-1"
                                />
                                <div>
                                <label
                                    htmlFor={`current-roteiro-${index}`}
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
                            {index < currentRoteiroItems.length - 1 && <Separator className="my-2" />}
                            </li>
                        ))}
                        </ul>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-0">
                  <CardHeader><CardTitle className="font-headline text-xl">Desempenho (Simulado)</CardTitle></CardHeader>
                  <CardContent className="pl-0 sm:pl-2">
                    {isLoadingRoteiro ? <Skeleton className="h-[350px] w-full" /> : 
                     <div className="p-6">
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <BarChart accessibilityLayer data={currentDesempenho || []} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="data" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="alcance" fill="var(--color-alcance)" radius={8} className="fill-primary" />
                            <Bar dataKey="engajamento" fill="var(--color-engajamento)" radius={8} />
                        </BarChart>
                        </ChartContainer>
                     </div>
                    }
                  </CardContent>
                </Card>
            </div>
         </div>
      )}


      {(isGenerating || result) && (
        <div className="space-y-8 animate-fade-in">
          <Separator />
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-center sm:text-left">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Plano Gerado
              </h2>
              <p className="text-muted-foreground">
                Revise o plano abaixo. Ele será salvo automaticamente.
              </p>
            </div>
          </div>

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
                  <CardTitle className="font-headline text-xl">
                    Novo Roteiro de Conteúdo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-6">
                    <ul className="space-y-2">
                        {result.roteiro.map((item, index) => (
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
                            {index < result.roteiro.length - 1 && (
                            <Separator className="my-2" />
                            )}
                        </li>
                        ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">
                    Nova Simulação de Desempenho
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-0 sm:pl-2">
                  <div className="p-6">
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
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar
                            dataKey="alcance"
                            fill="var(--color-alcance)"
                            radius={8}
                            className="fill-primary"
                        />
                        <Bar
                            dataKey="engajamento"
                            fill="var(--color-engajamento)"
                            radius={8}
                        />
                        </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

