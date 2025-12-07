
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
} from 'lucide-react';
import { useTransition, useEffect, useState, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(1, 'As métricas não podem estar vazias.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = 'media-kit-result';


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


export function MediaKitResultView({ result, formValues, isSheetView = false }: { result: any, formValues: FormSchemaType, isSheetView?: boolean }) {
    if (!result) return null;

    return (
        <div className={cn("space-y-8 animate-fade-in", !isSheetView && "p-6")}>
            <InfoCard title="Apresentação para Marcas" icon={FileText} content={result.executiveSummary} />
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <PricingCard title="Tabela de Preços Sugerida" icon={DollarSign} pricing={result.pricingTiers} />
                <InfoList title="Ideias de Colaboração" icon={Lightbulb} items={result.sampleCollaborationIdeas} />
            </div>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <InfoCard title="Sua Proposta de Valor" icon={Target} content={result.valueProposition} />
                <InfoCard title="Alinhamento com a Marca" icon={Briefcase} content={result.brandAlignment} />
            </div>
            <InfoList title="Dicas de Negociação" icon={Handshake} items={result.negotiationTips} />
        </div>
    );
}

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
                    O Mídia Kit é um recurso exclusivo para assinantes Premium.
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
  const { toast } = useToast();
  const [isGenerating, startTransition] = useTransition();
  const [result, setResult] = useState<AiCareerPackageOutput | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

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

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

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
      const actionResult = await getAiCareerPackageAction(null, formData);
      if(actionResult?.error) {
          toast({
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
  }, [startTransition, setActiveTab, toast]);

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
        targetBrand: form.getValues('targetBrand') || '',
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

  const handleSave = (data: AiCareerPackageOutput) => {
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
          aiResponseData: { ...data, targetBrand: targetBrand },
        });

        toast({
          title: 'Sucesso!',
          description: 'Seu pacote de prospecção foi salvo.',
        });
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setResult(null);
        setActiveTab("generate");
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
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
    setActiveTab("generate");
    toast({
        title: 'Resultado Descartado',
        description: 'Você pode gerar um novo pacote agora.',
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pacote de Prospecção"
        description="Gere propostas, preços e seu mídia kit profissional."
        icon={Briefcase}
      >
        <SavedIdeasSheet />
      </PageHeader>
      
      <div>
        <div className="text-center">
            <h2 className="text-xl font-bold font-headline">Como Criamos seu Pacote?</h2>
            <p className="text-muted-foreground">A IA atua como sua gerente de talentos e foca em 4 pilares:</p>
        </div>
        <Separator className="w-1/2 mx-auto my-4" />
        <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}>
                    <CarouselContent className="-ml-4">
                        {analysisCriteria.map((item, index) => (
                            <CarouselItem key={index} className="pl-4 basis-full">
                                <Card className="h-full rounded-2xl border-0 text-center">
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
                    <Card key={index} className='rounded-2xl border-0 text-center'>
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
          <TabsTrigger value="generate">Gerar Pacote</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>
            Resultado
            {isGenerating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
           <Card className="rounded-t-none border-t-0">
            <CardContent>
               <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <h2 className="text-2xl font-bold font-headline">Defina o Briefing de Prospecção</h2>
                    <p className="text-muted-foreground max-w-xl">
                       Clique no botão abaixo para definir o nicho, métricas e marca-alvo. Isso ajuda a IA a criar uma proposta mais alinhada e profissional.
                    </p>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                         <Button size="lg" disabled={isGenerating || isLoadingProfile}>
                           {isGenerating ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote</>
                            )}
                         </Button>
                      </DialogTrigger>
                       <DialogContent className="sm:max-w-2xl p-0">
                          <SheetContent side="right" className="p-0 sm:max-w-2xl flex flex-col gap-0">
                            <SheetHeader className="p-6 pb-4 border-b">
                                <SheetTitle className="flex items-center justify-center gap-3 font-headline text-xl">
                                    <Bot className="h-6 w-6 text-primary" />
                                    <span>Assistente de Carreira</span>
                                </SheetTitle>
                                <SheetDescription className='text-center'>Forneça os detalhes para a IA criar um pacote de prospecção completo.</SheetDescription>
                            </SheetHeader>
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
                                                      placeholder="Defina em seu Perfil"
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
                                                      placeholder="Defina em seu Perfil"
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
                            <SheetFooter className="p-6 border-t flex-col sm:flex-row gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                                <Button
                                type="button"
                                onClick={form.handleSubmit(formAction)}
                                disabled={isGenerating || isLoadingProfile}
                                className="w-full sm:w-auto"
                                >
                                {isGenerating ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                                ) : (
                                    <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote</>
                                )}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                      </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="result">
          <Card className="rounded-t-none border-t-0">
            <CardHeader className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado Gerado</h2>
                <p className="text-muted-foreground">Um pacote completo para sua prospecção.</p>
            </CardHeader>
            <CardContent>
              {(isGenerating || result) && (
                <div className="space-y-8 animate-fade-in">
                  {result && (
                      <div className='flex justify-center gap-2 flex-wrap'>
                         <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Pacote
                        </Button>
                        <Button onClick={handleDiscard} variant="outline" className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Descartar
                        </Button>
                        <Link href={`/publis-assistant?product=${encodeURIComponent(form.getValues('targetBrand'))}&differentiators=${encodeURIComponent(result.valueProposition)}&targetAudience=${encodeURIComponent(userProfile?.audience || '')}`}
                         className={cn(buttonVariants({ variant: 'default', className: 'w-full sm:w-auto' }))}>
                           <Newspaper className="mr-2 h-4 w-4" />
                           Criar Publi para esta Marca
                        </Link>
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
       </Tabs>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
}) {
  return (
    <Card
      className="h-full shadow-none border-0"
    >
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         <div className="p-4 rounded-xl border bg-muted/30 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
      </CardContent>
    </Card>
  );
}


function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card className="h-full shadow-none border-0">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-3 rounded-xl bg-muted/30 border"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function PricingCard({
  title,
  icon: Icon,
  pricing,
}: {
  title: string;
  icon: React.ElementType;
  pricing: AiCareerPackageOutput['pricingTiers'];
}) {
  return (
    <Card
      className="h-full shadow-none border-0"
    >
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-xs text-muted-foreground mb-4'>Valores baseados em suas métricas. Use como ponto de partida.</p>
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Formato</TableHead>
            <TableHead className="text-right">Faixa de Preço</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow>
            <TableCell className="font-medium">Reels</TableCell>
            <TableCell className="text-right font-mono">{pricing.reels || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium">Sequência de Stories</TableCell>
            <TableCell className="text-right font-mono">{pricing.storySequence || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium">Post Estático (Feed)</TableCell>
            <TableCell className="text-right font-mono">{pricing.staticPost || 'A calcular'}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="font-medium text-primary">Pacote Mensal</TableCell>
            <TableCell className="text-right font-mono text-primary font-bold">{pricing.monthlyPackage || 'A calcular'}</TableCell>
            </TableRow>
        </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
