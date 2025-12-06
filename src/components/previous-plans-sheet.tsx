
'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva } from '@/lib/types';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { History, Eye, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import React, { useState } from 'react';

export function PreviousPlansSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedPlan, setSelectedPlan] = useState<IdeiaSalva | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

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

  return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Histórico de Planos
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className='p-6 pb-4 border-b'>
          <SheetTitle className="font-headline text-xl">Histórico de Planos</SheetTitle>
          <SheetDescription>
            Consulte os planos semanais que você já salvou.
          </SheetDescription>
        </SheetHeader>
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
                  Nenhum plano salvo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quando você salvar um plano semanal, ele aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    {selectedPlan && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
                <SheetHeader className='p-6 pb-4 border-b'>
                <SheetTitle className="font-headline text-2xl">
                    {selectedPlan.titulo}
                </SheetTitle>
                 <SheetDescription>
                   Salvo em {selectedPlan.createdAt ? new Date(selectedPlan.createdAt.toDate()).toLocaleDateString('pt-BR') : ''}
                 </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                <div className="p-6">
                <Textarea
                    readOnly
                    value={selectedPlan.conteudo}
                    className="h-full w-full text-base leading-relaxed resize-none rounded-xl bg-muted/50 border-0 min-h-[60vh] focus-visible:ring-0"
                />
                </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )}
    </>
  );
}
