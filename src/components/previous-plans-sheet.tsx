
'use client';

import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva, PlanoSemanal } from '@/lib/types';
import { collection, orderBy, query, where, getDocs, writeBatch, doc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { History, Eye, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from './ui/sheet';
import { useRouter } from 'next/navigation';

export function PreviousPlansSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);

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

  const handleReactivatePlan = async (planToReactivate: IdeiaSalva) => {
    if (!firestore || !user || !planToReactivate.aiResponseData) {
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar o plano. Dados incompletos.',
        variant: 'destructive',
      });
      return;
    }

    setIsListSheetOpen(false);

    try {
      const batch = writeBatch(firestore);
      const planData = planToReactivate.aiResponseData as Omit<PlanoSemanal, 'id' | 'createdAt'>;

      // 1. Archive any currently active plan
      const activePlanCollectionRef = collection(firestore, `users/${user.uid}/weeklyPlans`);
      const activePlansSnapshot = await getDocs(activePlanCollectionRef);
      
      for (const planDoc of activePlansSnapshot.docs) {
        const oldPlanData = planDoc.data() as PlanoSemanal;
        const newArchivedRef = doc(collection(firestore, `users/${user.uid}/ideiasSalvas`));
        
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
        
        batch.delete(planDoc.ref);
      }

      // 2. Create the reactivated plan as the new active plan
      const newActivePlanRef = doc(activePlanCollectionRef);
      batch.set(newActivePlanRef, {
        ...planData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        items: planData.items.map(item => ({ ...item, concluido: false })), // Reset completion status
      });

      // 3. Delete the plan from the history (ideiasSalvas)
      const planInHistoryRef = doc(firestore, `users/${user.uid}/ideiasSalvas`, planToReactivate.id);
      batch.delete(planInHistoryRef);

      // 4. Commit all operations
      await batch.commit();
      
      toast({
        title: 'Plano Reativado!',
        description: 'O plano selecionado é agora o seu plano ativo.',
      });

      router.push('/generate-weekly-plan?tab=activePlan');

    } catch (e: any) {
      console.error("Error reactivating plan:", e);
      toast({
        title: 'Erro ao Reativar',
        description: `Ocorreu um erro: ${e.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={isListSheetOpen} onOpenChange={setIsListSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Histórico de Planos
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 flex flex-col sm:max-w-lg">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="font-headline text-xl">Histórico de Planos</SheetTitle>
          <SheetDescription>
            Consulte e reative planos semanais que você já salvou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
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
                            <Button variant="ghost" size="sm" className='h-8' onClick={() => handleReactivatePlan(plan)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Reativar Plano
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
        <div className="p-6 border-t">
            <SheetClose asChild>
                <Button type="button" variant="outline" className='w-full'>Fechar</Button>
            </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
