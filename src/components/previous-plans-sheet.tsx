
'use client';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTrigger, ResponsiveDialogHeader, ResponsiveDialogFooter, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogClose } from '@/components/ui/responsive-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva, PlanoSemanal, ItemRoteiro } from '@/lib/types';
import { collection, orderBy, query, where, getDocs, writeBatch, doc, addDoc } from 'firebase/firestore';
import { History, Eye, Inbox, Loader2, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import React, { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from './ui/chart';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

const chartConfig = {
  alcance: { label: 'Alcance', color: 'hsl(var(--primary))' },
  engajamento: { label: 'Engajamento', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;


export function PreviousPlansSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IdeiaSalva | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isActivating, startActivatingTransition] = useTransition();

  const savedPlansQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            where('origem', '==', 'Plano Semanal'),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  const { data: savedPlans, isLoading } =
    useCollection<IdeiaSalva>(savedPlansQuery);

  const handleViewDetails = (plan: IdeiaSalva) => {
    setSelectedPlan(plan);
    setIsDetailSheetOpen(true);
  };
  
  const handleActivatePlan = (planToActivate: IdeiaSalva) => {
    if (!user || !firestore || !planToActivate.aiResponseData) return;

    startActivatingTransition(async () => {
      try {
        const batch = writeBatch(firestore);
        const activePlanCollectionRef = collection(firestore, `users/${user.uid}/weeklyPlans`);
        const ideasCollectionRef = collection(firestore, `users/${user.uid}/ideiasSalvas`);

        const oldPlansSnapshot = await getDocs(activePlanCollectionRef);
        if (!oldPlansSnapshot.empty) {
          const oldPlanDoc = oldPlansSnapshot.docs[0];
          const oldPlanData = oldPlanDoc.data() as PlanoSemanal;
          
          const newArchivedRef = doc(ideasCollectionRef);
          batch.set(newArchivedRef, {
             userId: user.uid,
             titulo: `Plano Arquivado de ${oldPlanData.createdAt.toDate().toLocaleDateString('pt-BR')}`,
             conteudo: oldPlanData.items.map(item => `**${item.dia}:** ${item.tarefa}`).join('\n'),
             origem: "Plano Semanal",
             concluido: false,
             createdAt: oldPlanData.createdAt,
             aiResponseData: oldPlanData,
          });
          
          batch.delete(oldPlanDoc.ref);
        }

        const newActivePlanRef = doc(activePlanCollectionRef);
        batch.set(newActivePlanRef, planToActivate.aiResponseData);

        batch.delete(doc(ideasCollectionRef, planToActivate.id));

        toast({
            title: "Plano Ativado!",
            description: "O plano selecionado é agora seu plano semanal ativo."
        });
        setIsDetailSheetOpen(false);

      } catch (e: any) {
        toast({
          title: 'Erro ao Ativar Plano',
          description: e.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <>
    <ResponsiveDialog isOpen={isListSheetOpen} onOpenChange={setIsListSheetOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Histórico de Planos
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="w-full sm:max-w-lg p-0">
        <ResponsiveDialogHeader className='p-6 pb-4 border-b'>
          <ResponsiveDialogTitle className="font-headline text-xl">Histórico de Planos</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Consulte e reative planos semanais que você já salvou.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-6 space-y-4">
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && savedPlans && savedPlans.length > 0 && (
              <ul className="space-y-4">
                {savedPlans.map((plan) => (
                  <li key={plan.id}>
                    <div className="border p-4 rounded-xl hover:border-primary/50 transition-colors">
                       <p className="font-semibold text-foreground break-words mb-2">
                        {plan.titulo}
                      </p>
                       <div className='flex justify-between items-center'>
                         <p className="text-xs text-muted-foreground">
                          Salvo {plan.createdAt &&
                            formatDistanceToNow(plan.createdAt.toDate(), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                        </p>
                        <Button variant="ghost" size="sm" className='h-8' onClick={() => handleViewDetails(plan)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Completo
                        </Button>
                       </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!isLoading && (!savedPlans || savedPlans.length === 0) && (
              <div className="text-center py-20 px-4 rounded-xl bg-muted/50 border border-dashed">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground">
                  Nenhum plano no histórico
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quando você gerar e salvar um novo plano, o antigo virá para cá.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    {selectedPlan && selectedPlan.aiResponseData && (
        <ResponsiveDialog isOpen={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <ResponsiveDialogContent className="w-full sm:max-w-4xl p-0 flex flex-col">
                <ResponsiveDialogHeader className='p-6 pb-4 border-b'>
                <ResponsiveDialogTitle className="font-headline text-2xl">
                    {selectedPlan.titulo}
                </ResponsiveDialogTitle>
                 <ResponsiveDialogDescription>
                   Salvo em {selectedPlan.createdAt ? new Date(selectedPlan.createdAt.toDate()).toLocaleDateString('pt-BR') : ''}
                 </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ScrollArea className="flex-1">
                <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    <Card className="shadow-none border-0">
                        <CardHeader>
                        <CardTitle className="font-headline text-xl">Roteiro de Conteúdo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {selectedPlan.aiResponseData.items.map((item: ItemRoteiro, index: number) => (
                                    <li key={index}>
                                    <div className="flex items-start gap-4 p-2 rounded-lg">
                                        <div className='flex-1'>
                                        <p className={'font-medium text-base text-foreground'}>
                                            <span className="font-semibold text-primary">{item.dia}:</span> {item.tarefa}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{item.detalhes}</p>
                                        </div>
                                    </div>
                                    {index < selectedPlan.aiResponseData.items.length - 1 && <Separator className="my-2" />}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-0">
                        <CardHeader><CardTitle className="font-headline text-xl">Desempenho Simulado</CardTitle></CardHeader>
                        <CardContent className="pl-0 sm:pl-2">
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <BarChart data={selectedPlan.aiResponseData.desempenhoSimulado} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
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
                </ScrollArea>
                 <ResponsiveDialogFooter className="p-4 border-t">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full sm:w-auto" disabled={isActivating}>
                               <Zap className="mr-2 h-4 w-4" />
                               {isActivating ? 'Ativando...' : 'Ativar este Plano'}
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Ativar este plano?</AlertDialogTitle>
                            <AlertDialogDescription>
                                O plano atualmente ativo será movido para o histórico e este se tornará o principal no seu dashboard e na página de planos. Deseja continuar?
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleActivatePlan(selectedPlan)}>
                                Sim, Ativar
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )}
    </>
  );
}
