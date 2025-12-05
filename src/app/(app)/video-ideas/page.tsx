
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


const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

type VideoIdeasState = {
  data?: GenerateVideoIdeasOutput;
  error?: string;
} | null;


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
  const [state, setState] = useState<VideoIdeasState>(null);
  const [activeTab, setActiveTab] = useState("generate");


  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const { subscription, isTrialActive } = useSubscription();
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');

  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

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
  
  const formAction = async (formData: FormSchemaType) => {
    startTransition(async () => {
      const result = await generateVideoIdeasAction(null, formData);
      setState(result);
       if (result?.data) {
        setActiveTab("result");
      }
    });
  };
  
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
  const result = state?.data;

  useEffect(() => {
    if (userProfile) {
      form.reset({
        topic: form.getValues('topic') || '',
        targetAudience: userProfile.audience || '',
        objective: form.getValues('objective') || 'Engajamento',
      });
    }
  }, [userProfile, form]);
  

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro ao Gerar Ideias',
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
  }, [state, result, firestore, user, todayStr, toast]);

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
        const scriptContent = typeof data.script === 'string'
          ? data.script
          : JSON.stringify(data.script, null, 2);
        const content = `**Gancho:**\n${data.gancho}\n\n**Roteiro:**\n${scriptContent}\n\n**CTA:**\n${data.cta}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Ideias de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
          completedAt: null,
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua ideia foi salva.',
        });
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
                    <CarouselContent className="-ml-4 py-4">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-full">
                                <Card className="rounded-2xl border-0 h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3">
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
                            <CardTitle className="flex items-center gap-3">
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
                <Form {...form}>
                    <form
                    onSubmit={form.handleSubmit(formAction)}
                    className="space-y-8"
                    >
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                        <FormField
                        control={form.control}
                        name="topic"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tópico Principal</FormLabel>
                            <FormControl>
                                <Input
                                placeholder="Ex: Rotina de skincare para pele oleosa"
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
                        name="targetAudience"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Público-Alvo</FormLabel>
                            <FormControl>
                                <Input
                                placeholder="Ex: Mulheres de 25-35 anos"
                                className="h-11"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                    
                        <FormField
                            control={form.control}
                            name="objective"
                            render={({ field }) => (
                            <FormItem className='md:col-span-2'>
                                <FormLabel>Objetivo</FormLabel>
                                <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                name={field.name}
                                >
                                <FormControl>
                                    <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Engajamento">
                                    Engajamento
                                    </SelectItem>
                                    <SelectItem value="Alcance">Alcance</SelectItem>
                                    <SelectItem value="Vendas">Vendas</SelectItem>
                                    <SelectItem value="Educar">Educar</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                        <Button
                        type="submit"
                        disabled={isButtonDisabled}
                        size="lg"
                        className="w-full sm:w-auto"
                        >
                        {isGenerating ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Gerando Ideia...
                            </>
                        ) : (
                            <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Gerar Ideia
                            </>
                        )}
                        </Button>
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
                    </form>
                </Form>
              </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="result">
          <Card className="rounded-t-none border-t-0">
             <CardContent className="p-6">
              {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                        Resultado Gerado
                      </h2>
                      <p className="text-muted-foreground">
                        Um plano de conteúdo completo para seu próximo vídeo.
                      </p>
                    </div>
                    {result && (
                      <div className="flex w-full sm:w-auto gap-2">
                        <Button
                          onClick={() => handleSave(result)}
                          disabled={isSaving}
                          className="w-full sm:w-auto"
                        >
                          {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Salvar Ideia
                        </Button>
                      </div>
                    )}
                  </div>

                  {isGenerating && !result ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">
                        Criando algo incrível para você...
                      </p>
                    </div>
                  ) : result ? (
                    <div className="grid gap-6">
                      <div className="grid lg:grid-cols-2 gap-6">
                        <InfoCard
                          title="Gancho"
                          icon={Mic}
                          content={result.gancho}
                        />
                        <InfoCard
                          title="CTA"
                          icon={Heart}
                          content={result.cta}
                        />
                      </div>
                      <InfoCard
                        title="Roteiro do Vídeo"
                        icon={Pen}
                        content={typeof result.script === 'string' ? result.script : JSON.stringify(result.script, null, 2)}
                      />
                      <InfoListCard
                        title="Takes para Gravar"
                        icon={Camera}
                        content={result.takes}
                      />
                      <div className="grid lg:grid-cols-2 gap-6">
                        <InfoCard
                          title="Horário Sugerido"
                          icon={Clock}
                          content={result.suggestedPostTime}
                        />
                        <InfoCard
                          title="Música em Alta"
                          icon={Disc}
                          content={result.trendingSong}
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
    <Card
      className={cn("border-0 rounded-2xl", className)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {title === 'Roteiro do Vídeo' ? (
          <Textarea
            readOnly
            value={content}
            className="h-48 bg-muted/30 text-base leading-relaxed resize-none rounded-xl"
          />
        ) : (
          <p className="p-4 rounded-xl border bg-muted/30 text-base text-foreground">
            {content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoListCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string[];
}) {
  return (
    <Card className="rounded-2xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={content.map((take, index) => `${index + 1}. ${take}`).join('\n')}
          className="h-48 bg-muted/30 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}

    