
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Loader2, Sparkles, Trash2, Check } from 'lucide-react';
import { useEffect, useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { generateWeeklyPlanAction } from './actions';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import type { UserProfile, ItemRoteiro, PontoDadosGrafico, PlanoSemanal } from '@/lib/types';
import {
  doc,
  writeBatch,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
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


const formSchema = z.object({
  objective: z.string().min(10, 'O objetivo precisa ser mais detalhado.'),
  niche: z.string().min(1, 'O nicho é obrigatório.'),
  currentStats: z.string().min(1, 'As estatísticas são obrigatórias.'),
});

const chartConfig = {
  alcance: { label: 'Alcance', color: 'hsl(var(--primary))' },
  engajamento: { label: 'Engajamento', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

async function clearCollection(firestore: any, collectionPath: string) {
  const q = query(collection(firestore, collectionPath));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return;
  const batch = writeBatch(firestore);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export default function GenerateWeeklyPlanPage() {
  const { toast } = useToast();
  const [state, formAction, isGenerating] = useActionState(
    generateWeeklyPlanAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch user profile
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userProfileRef);

  // Fetch current weekly plan
  const roteiroQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'roteiro'), orderBy('createdAt', 'desc'), limit(1)) : null),
    [firestore]
  );
  const { data: roteiroData, isLoading: isLoadingRoteiro } = useCollection<PlanoSemanal>(roteiroQuery);
  const currentRoteiroItems = roteiroData?.[0]?.items;

  // Fetch current performance data
  const dadosGraficoQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'dadosGrafico'), limit(7)) : null),
    [firestore]
  );
  const { data: currentDesempenho, isLoading: isLoadingGrafico } = useCollection<PontoDadosGrafico>(dadosGraficoQuery);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: '',
      niche: '',
      currentStats: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
       const stats = [
        userProfile.followers ? `${userProfile.followers} seguidores` : '',
        userProfile.averageViews ? `${userProfile.averageViews} de média de views` : '',
      ].filter(Boolean).join(', ');

      form.reset({
        objective: 'Aumentar o engajamento em 15% com conteúdo de valor',
        niche: userProfile.niche || '',
        currentStats: stats,
      });
    }
  }, [userProfile, form]);

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
          await clearCollection(firestore, 'roteiro');
          await clearCollection(firestore, 'dadosGrafico');

          const batch = writeBatch(firestore);

          const roteiroRef = doc(collection(firestore, 'roteiro'));
          batch.set(roteiroRef, {
            items: result.roteiro,
            createdAt: serverTimestamp(),
          });

          result.desempenhoSimulado.forEach((ponto) => {
            const pontoRef = doc(collection(firestore, 'dadosGrafico'));
            batch.set(pontoRef, ponto);
          });

          await batch.commit();

          toast({
            title: 'Sucesso!',
            description:
              'Seu novo roteiro e simulação de desempenho foram salvos e estão no dashboard.',
          });
        } catch (e: any) {
          toast({
            title: 'Erro ao Salvar Plano',
            description: `Não foi possível salvar os dados no Firestore: ${e.message}`,
            variant: 'destructive',
          });
        }
      });
    }
  }, [state, result, firestore, toast]);

  const handleDeletePlan = () => {
    if (!firestore) return;

    startDeletingTransition(async () => {
      try {
        await clearCollection(firestore, 'roteiro');
        await clearCollection(firestore, 'dadosGrafico');
        toast({
          title: 'Plano Excluído!',
          description:
            'O roteiro semanal e os dados de desempenho foram removidos.',
        });
      } catch (e: any) {
        toast({
          title: 'Erro ao Excluir',
          description: `Não foi possível limpar os dados: ${e.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  const handleToggleRoteiro = async (item: ItemRoteiro) => {
    if (!firestore || !roteiroData?.[0]) return;
    const planoRef = doc(firestore, 'roteiro', roteiroData[0].id);
    const updatedItems = currentRoteiroItems?.map((i) =>
      i.tarefa === item.tarefa ? { ...i, concluido: !i.concluido } : i
    );
    try {
      await updateDoc(planoRef, { items: updatedItems });
    } catch (error) {
      console.error('Failed to update roteiro status:', error);
    }
  };


  return (
    <div className="space-y-12">
      <PageHeader
        title="Planejamento de Conteúdo Semanal"
        description="Defina um objetivo e deixe a IA criar um plano de ação completo para sua semana."
      />

      <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-headline text-xl">
            <Bot className="h-6 w-6 text-primary" />
            <span>Briefing da Semana</span>
          </CardTitle>
          <CardDescription>
            Quanto mais detalhes você fornecer, melhor será o plano gerado pela
            IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-8">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Qual seu principal objetivo para esta semana?
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 'Aumentar o engajamento com Reels de humor'"
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
                              placeholder="Defina em Configurações > Perfil"
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
                              placeholder="Defina em Configurações > Perfil"
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

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button
                  type="submit"
                  disabled={isGenerating || isSaving || isLoadingProfile}
                  size="lg"
                  className="font-manrope sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                >
                  {isGenerating || isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isSaving ? 'Salvando...' : 'Gerando Plano...'}
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
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-full font-manrope"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Excluir Plano Atual
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Tem certeza que quer excluir o plano?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá o roteiro e os dados de desempenho
                        do seu painel. Você poderá gerar um novo a qualquer
                        momento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePlan}>
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Current Plan Section */}
      {!result && (isLoadingRoteiro || isLoadingGrafico) && (
         <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <Card className="rounded-2xl"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div></CardContent></Card>
              <Card className="rounded-2xl"><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-[350px] w-full" /></CardContent></Card>
            </div>
          </div>
      )}

      {!result && !isLoadingRoteiro && currentRoteiroItems && currentRoteiroItems.length > 0 && (
         <div className="space-y-8 animate-fade-in">
           <Separator />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Seu Plano Atual</h2>
              <p className="text-muted-foreground">Este é o roteiro que está ativo no seu painel.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
                  <CardHeader><CardTitle className="font-headline text-xl">Roteiro de Conteúdo</CardTitle></CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
                  <CardHeader><CardTitle className="font-headline text-xl">Desempenho Semanal (Simulado)</CardTitle></CardHeader>
                  <CardContent className="pl-2">
                    {isLoadingGrafico ? <Skeleton className="h-[350px] w-full" /> : 
                     <ChartContainer config={chartConfig} className="h-[350px] w-full">
                       <BarChart accessibilityLayer data={currentDesempenho || []} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="data" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                          <Bar dataKey="alcance" fill="var(--color-alcance)" radius={8} className="fill-primary" />
                          <Bar dataKey="engajamento" fill="var(--color-engajamento)" radius={8} />
                       </BarChart>
                     </ChartContainer>
                    }
                  </CardContent>
                </Card>
            </div>
         </div>
      )}


      {(isGenerating || result) && (
        <div className="space-y-8 animate-fade-in">
          <Separator />
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Plano Gerado pela IA
              </h2>
              <p className="text-muted-foreground">
                Revise o plano abaixo. Se estiver bom, ele será salvo e
                substituirá o plano atual.
              </p>
            </div>
          </div>

          {isGenerating && !result ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                A IA está montando sua estratégia...
              </p>
            </div>
          ) : result ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">
                    Novo Roteiro de Conteúdo
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">
                    Nova Simulação de Desempenho
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[350px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={result.desempenhoSimulado}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
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
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
