'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { collection, orderBy, query } from 'firebase/firestore';
import { BookMarked, Eye, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import React from 'react';

export function SavedIdeasSheet() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ideiasSalvasQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `users/${user.uid}/ideiasSalvas`),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  const { data: ideiasSalvas, isLoading } =
    useCollection<IdeiaSalva>(ideiasSalvasQuery);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="font-manrope rounded-full">
          <BookMarked className="mr-2 h-4 w-4" />
          Salvos
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-headline text-xl">Ideias Salvas</SheetTitle>
          <SheetDescription>
            Acesse aqui todas as ideias geradas pela IA que você salvou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          <div className="space-y-4">
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && ideiasSalvas && ideiasSalvas.length > 0 && (
              <ul className="space-y-4">
                {ideiasSalvas.map((ideia) => (
                  <li key={ideia.id}>
                    <div className="border p-4 rounded-xl hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary">{ideia.origem}</Badge>
                        {ideia.concluido && <Badge>Concluído</Badge>}
                      </div>
                      <p className="font-semibold text-foreground break-words mb-2">
                        {ideia.titulo}
                      </p>
                       <div className='flex justify-between items-center'>
                         <p className="text-xs text-muted-foreground">
                          {ideia.createdAt &&
                            formatDistanceToNow(ideia.createdAt.toDate(), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className='h-8'>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Completo
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-headline text-2xl">
                                {ideia.titulo}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <Textarea
                                readOnly
                                value={ideia.conteudo}
                                className="h-96 w-full text-base leading-relaxed resize-none rounded-xl bg-muted/50"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                       </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!isLoading && (!ideiasSalvas || ideiasSalvas.length === 0) && (
              <div className="text-center py-20 px-4 rounded-xl bg-muted/50 border border-dashed">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground">
                  Nenhuma ideia salva
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use as ferramentas de IA e salve seus resultados.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
