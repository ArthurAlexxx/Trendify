
'use client';

import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva, PlanoSemanal, ItemRoteiro } from '@/lib/types';
import { collection, orderBy, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { History, Eye, Inbox, Loader2, Zap, Trophy, AlertTriangle } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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

  const handleViewDetails = (plan: IdeiaSalva) => {
    if (plan.aiResponseData) {
      localStorage.setItem('ai-result-to-view', JSON.stringify(plan));
      setIsListSheetOpen(false); // Close the list sheet
      router.push('/generate-weekly-plan');
    } else {
      toast({
        title: 'Erro',
        description: 'Os dados do plano não foram encontrados.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
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
                            <Button variant="ghost" size="sm" className='h-8' onClick={() => handleViewDetails(plan)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
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
         <SheetFooter className="p-6 border-t">
            <SheetClose asChild>
                <Button type="button" variant="outline" className='w-full'>Fechar</Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}
