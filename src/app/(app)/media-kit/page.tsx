'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { useTransition, useEffect, useState, useCallback, useRef } from 'react';
import {
  Form,
  FormControl,
  FormDescription,
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

const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(1, 'As métricas não podem estar vazias.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

type CareerPackageState = {
  data?: AiCareerPackageOutput;
  error?: string;
} | null;


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
  const [state, setState] = useState<CareerPackageState>(null);
  
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

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

  const formAction = async (formData: FormSchemaType) => {
    startTransition(async () => {
      const result = await getAiCareerPackageAction(null, formData);
      setState(result);
    });
  };

   useEffect(() => {
    if (userProfile) {
      const metrics = [
        userProfile.instagramFollowers ? `${userProfile.instagramFollowers} seguidores` : '',
        userProfile.instagramAverageViews ? `${userProfile.instagramAverageViews} de média de views` : '',
        userProfile.audience ? `Público: ${userProfile.audience}` : '',
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

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

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
        const title = `Pacote de Prospecção para ${form.getValues('targetBrand')}`;
        
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
        });

        toast({
          title: 'Sucesso!',
          description: 'Seu pacote de prospecção foi salvo.',
        });
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

  const result = state?.data;

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

      <div className="space-y-8">
          
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <Bot className="h-6 w-6 text-primary" />
                <span>Assistente de Carreira</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6">
                <Form {...form}>
                    <form
                    onSubmit={form.handleSubmit(formAction)}
                    className="space-y-8"
                    >
                    <div className="space-y-6">
                        <FormField
                        control={form.control}
                        name="niche"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Seu Nicho</FormLabel>
                            <FormControl>
                                {isLoadingProfile ? <Skeleton className="h-11 w-full" /> : 
                                <Input
                                    placeholder="Defina em seu Perfil"
                                    className="h-11"
                                    {...field}
                                />
                                }
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                        <FormField
                            control={form.control}
                            name="keyMetrics"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Métricas Chave</FormLabel>
                                <FormControl>
                                {isLoadingProfile ? <Skeleton className="h-11 w-full" /> :
                                    <Input
                                    placeholder="Defina em seu Perfil"
                                    className="h-11"
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
                                    className="h-11"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>
                    </div>
                    <div className="pt-2 flex justify-start">
                        <Button
                        type="submit"
                        disabled={isGenerating || isLoadingProfile}
                        size="lg"
                        className="w-full sm:w-auto"
                        >
                        {isGenerating ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                        ) : (
                            <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote de Prospecção</>
                        )}
                        </Button>
                    </div>
                    </form>
                </Form>
              </div>
            </CardContent>
          </Card>

          {(isGenerating || result) && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className='flex-1'>
                  <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado Gerado</h2>
                  <p className="text-muted-foreground">Um pacote completo para sua prospecção.</p>
                </div>
                {result && (
                  <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Pacote
                  </Button>
                )}
              </div>

              {isGenerating && !result ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Criando seu pacote...</p>
                </div>
              ) : result ? (
                 <div className="grid gap-8">
                  <InfoCard title="Apresentação para Marcas" icon={FileText} content={result.executiveSummary} />
                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <PricingCard title="Tabela de Preços Sugerida" icon={DollarSign} pricing={result.pricingTiers} />
                    <InfoList title="Ideias de Colaboração" icon={Lightbulb} items={result.sampleCollaborationIdeas} />
                  </div>
                </div>
              ) : null}
            </div>
          )}
      </div>
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
      className="border-0 rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         <div className="p-6">
            <div className="p-4 rounded-xl border bg-muted/30 text-base text-foreground whitespace-pre-wrap">
                {content}
            </div>
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
    <Card className="border-0 rounded-2xl h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-6">
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
      className="border-0 rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-6">
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
        </div>
      </CardContent>
    </Card>
  );
}
