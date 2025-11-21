
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Sparkles,
  Loader2,
  Save,
  DollarSign,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { useActionState, useTransition, useEffect, useState } from 'react';
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
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(10, 'Suas métricas devem ter pelo menos 10 caracteres.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

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
                <AlertDialogHeader>
                  <AlertDialogTitle>Funcionalidade Premium</AlertDialogTitle>
                  <AlertDialogDescription>
                    O Mídia Kit é um recurso exclusivo para assinantes do plano Premium. Faça o upgrade para ter acesso!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push('/subscribe')}>Ver Planos</AlertDialogAction>
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
  const [state, formAction, isGenerating] = useActionState(
    getAiCareerPackageAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: '',
      keyMetrics: '',
      targetBrand: 'Sallve',
    },
  });

   useEffect(() => {
    if (userProfile) {
      const metrics = [
        userProfile.followers ? `${userProfile.followers} seguidores` : '',
        userProfile.averageViews ? `${userProfile.averageViews} de média de views` : '',
        userProfile.audience ? `Público: ${userProfile.audience}` : '',
      ].filter(Boolean).join(', ');

      form.reset({
        niche: userProfile.niche || '',
        keyMetrics: metrics,
        targetBrand: 'Sallve',
      });
    }
  }, [userProfile, form]);
  
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
        content += `- Reels: ${data.pricingTiers.reels}\n`;
        content += `- Stories: ${data.pricingTiers.storySequence}\n`;
        content += `- Post: ${data.pricingTiers.staticPost}\n`;
        content += `- Pacote: ${data.pricingTiers.monthlyPackage}\n\n`;
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
          description: 'Seu pacote de prospecção foi salvo no painel.',
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
    <div className="space-y-12">
      <PageHeader
        title="Propostas & Mídia Kit"
        description="Gere propostas, calcule preços e seu mídia kit profissional em um só lugar."
      >
        <SavedIdeasSheet />
      </PageHeader>
      <div className="space-y-12">
          
          <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <Bot className="h-6 w-6 text-primary" />
                <span>Assistente de Carreira</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  action={formAction}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                     <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seu Nicho de Atuação</FormLabel>
                          <FormControl>
                             {isLoadingProfile ? <Skeleton className="h-11 w-full" /> : 
                              <Input
                                placeholder="Defina seu nicho em Configurações > Perfil"
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
                            <FormLabel>Suas Métricas Chave</FormLabel>
                            <FormControl>
                              {isLoadingProfile ? <Skeleton className="h-11 w-full" /> :
                                <Input
                                  placeholder="Defina suas métricas em Configurações > Perfil"
                                  className="h-11"
                                  {...field}
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
                            <FormLabel>Marca Alvo (para contexto)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 'Sallve', 'Natura', 'Nike'"
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
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isGenerating || isLoadingProfile}
                      size="lg"
                      className="font-manrope sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
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
            </CardContent>
          </Card>

          {(isGenerating || result) && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className='flex-1'>
                  <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da IA</h2>
                  <p className="text-muted-foreground">Um pacote completo para sua prospecção de marcas.</p>
                </div>
                {result && (
                  <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Pacote
                  </Button>
                )}
              </div>

              {isGenerating && !result ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">A IA está criando seu pacote de prospecção...</p>
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
      className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         <div className="p-4 rounded-xl border bg-muted/30 text-base text-foreground whitespace-pre-wrap">
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
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
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
      className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-xs text-muted-foreground mb-4'>Valores baseados nas suas métricas. Use como ponto de partida para negociações.</p>
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
              <TableCell className="text-right font-mono">{pricing.reels}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">Sequência de Stories</TableCell>
              <TableCell className="text-right font-mono">{pricing.storySequence}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">Post Estático (Feed)</TableCell>
              <TableCell className="text-right font-mono">{pricing.staticPost}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium text-primary">Pacote Mensal</TableCell>
              <TableCell className="text-right font-mono text-primary font-bold">{pricing.monthlyPackage}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    