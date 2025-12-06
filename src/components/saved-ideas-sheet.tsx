
'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva } from '@/lib/types';
import { collection, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { BookMarked, Eye, Inbox, Loader2, Edit, Calendar, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VideoIdeasResultView } from '@/app/(app)/video-ideas/page';
import { PublisAssistantResultView } from '@/app/(app)/publis-assistant/page';
import { MediaKitResultView } from '@/app/(app)/media-kit/page';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function SavedIdeasSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedIdea, setSelectedIdea] = useState<IdeiaSalva | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeiaSalva | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
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
    setSelectedIdea(idea);
    setIsDetailSheetOpen(true);
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

  
  const getActionLink = (idea: IdeiaSalva | null): string => {
    if (!idea) return '/';
  
    const topic = encodeURIComponent(idea.titulo || '');
    const context = encodeURIComponent(idea.conteudo || '');
  
    switch (idea.origem) {
      case 'Ideias de Vídeo':
        return `/video-ideas?topic=${topic}&context=${context}`;
      case 'Propostas & Publis':
        return `/publis-assistant?product=${topic}&differentiators=${context}`;
      case 'Mídia Kit & Prospecção':
         const valueProposition = idea.aiResponseData?.valueProposition || context;
        return `/publis-assistant?product=${topic}&differentiators=${encodeURIComponent(valueProposition)}`;
      case 'Plano Semanal':
        return `/video-ideas?topic=Com base no meu plano semanal&context=${context}`;
      default:
        return '/dashboard';
    }
  }

  const renderResultView = (idea: IdeiaSalva) => {
    if (!idea.aiResponseData) {
       return <p className="text-muted-foreground p-6 whitespace-pre-wrap">{idea.conteudo}</p>;
    }
    switch (idea.origem) {
        case 'Ideias de Vídeo':
            return <VideoIdeasResultView result={idea.aiResponseData} formValues={{ topic: idea.titulo, targetAudience: 'N/A', objective: 'N/A' }} isSheetView={true} />;
        case 'Propostas & Publis':
             return <PublisAssistantResultView result={idea.aiResponseData} formValues={{ product: idea.titulo, targetAudience: 'N/A', differentiators: 'N/A', objective: 'N/A' }} isSheetView={true} />;
        case 'Mídia Kit & Prospecção':
            return <MediaKitResultView result={idea.aiResponseData} formValues={{ targetBrand: idea.titulo, niche: 'N/A', keyMetrics: 'N/A' }} isSheetView={true} />;
        default:
            return <p className="text-muted-foreground p-6 whitespace-pre-wrap">{idea.conteudo}</p>;
    }
  }


  return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <BookMarked className="mr-2 h-4 w-4" />
          Ideias Salvas
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className='p-6 pb-4 border-b'>
          <SheetTitle className="font-headline text-xl">Ideias Salvas</SheetTitle>
          <SheetDescription>
            Acesse aqui todas as ideias geradas pela IA que você salvou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-6 space-y-4">
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
    
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
          <AlertDialogDescription>
            A ideia "{ideaToDelete?.titulo}" será removida permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIdeaToDelete(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant: 'destructive'}))}>
            Sim, Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>


    {/* Detail View Sheet */}
    {selectedIdea && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col">
                <SheetHeader className='p-6 pb-4 border-b'>
                <SheetTitle className="font-headline text-2xl">
                    {selectedIdea.titulo}
                </SheetTitle>
                 <SheetDescription>
                   Gerado em {selectedIdea.origem}
                 </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                 {renderResultView(selectedIdea)}
                </ScrollArea>
                 <SheetFooter className="p-4 border-t flex flex-col sm:flex-row gap-2 justify-end">
                    <Link href={getActionLink(selectedIdea)} className={cn(buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' }))}>
                        <Edit className="mr-2 h-4 w-4" /> Usar esta Ideia
                    </Link>
                    <Link href={`/content-calendar?title=${encodeURIComponent(selectedIdea.titulo)}&notes=${encodeURIComponent(selectedIdea.conteudo)}`} className={cn(buttonVariants({ variant: 'default', className: 'w-full sm:w-auto' }))}>
                        <Calendar className="mr-2 h-4 w-4" /> Agendar Post
                    </Link>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )}
    </>
  );
}
