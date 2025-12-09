
'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTrigger, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogClose } from '@/components/ui/responsive-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva } from '@/lib/types';
import { collection, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { BookMarked, Eye, Inbox, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const originToPathMap: Record<string, string> = {
  'Ideias de Vídeo': '/video-ideas',
  'Plano Semanal': '/generate-weekly-plan',
  'Mídia Kit & Prospecção': '/media-kit',
  'Propostas & Publis': '/publis-assistant',
};

export function SavedIdeasSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeiaSalva | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleViewDetails = (idea: IdeiaSalva) => {
    const path = originToPathMap[idea.origem];
    if (path && idea.aiResponseData) {
      // Use a consistent key for storing the temporary data.
      localStorage.setItem('ai-result-to-view', JSON.stringify(idea));
      setIsSheetOpen(false); // Close the list sheet
      router.push(path);
    } else {
      toast({
        title: "Visualização indisponível",
        description: `Não foi possível encontrar a página de origem ou os dados para "${idea.origem}".`,
        variant: "destructive",
      });
    }
  };
  
  const confirmDelete = (idea: IdeiaSalva) => {
    setIdeaToDelete(idea);
    setIsDeleteDialogOpen(true);
  }

  const handleDelete = async () => {
    if (!ideaToDelete || !user || !firestore) return;
    
    try {
      await deleteDoc(doc(firestore, `users/${user.uid}/ideiasSalvas`, ideaToDelete.id));
      toast({
        title: "Ideia Excluída",
        description: `"${ideaToDelete.titulo}" foi removido permanentemente.`,
      });
      setIsDeleteDialogOpen(false);
      setIdeaToDelete(null);
    } catch(e: any) {
        toast({
          title: "Erro ao Excluir",
          description: e.message,
          variant: "destructive"
        });
    }
  }

  return (
    <>
    <ResponsiveDialog isOpen={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <ResponsiveDialogTrigger>
            <Button variant="outline">
                <BookMarked className="mr-2 h-4 w-4" />
                Salvos
            </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="font-headline text-xl">Itens Salvos</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
                Acesse aqui todas as ideias e planos gerados pela IA que você salvou.
            </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="flex-1 py-4 border-y">
                <ScrollArea className="h-96">
                <div className="px-6 space-y-4">
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
                                <div className='flex items-center gap-1'>
                                    <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => handleViewDetails(ideia)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive/70 hover:text-destructive' onClick={() => confirmDelete(ideia)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
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
                        Nenhum item salvo
                        </h3>
                        <p className="text-sm text-muted-foreground">
                        Use as ferramentas de IA e salve seus resultados.
                        </p>
                    </div>
                    )}
                </div>
                </ScrollArea>
            </div>
             <ResponsiveDialogFooter>
                <ResponsiveDialogClose asChild>
                    <Button type="button" variant="outline">Fechar</Button>
                </ResponsiveDialogClose>
            </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
    </ResponsiveDialog>
    
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
          <AlertDialogDescription>
            O item "{ideaToDelete?.titulo}" será removido permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIdeaToDelete(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            Sim, Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
