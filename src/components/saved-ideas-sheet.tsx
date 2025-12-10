
'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTrigger, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogClose, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva } from '@/lib/types';
import { collection, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { BookMarked, Eye, Inbox, Loader2, Trash2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import React, { useState, useMemo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { VideoIdeasResultView } from '@/app/(app)/video-ideas/video-ideas-result-view';
import { PublisAssistantResultView } from '@/app/(app)/publis-assistant/publis-assistant-result-view';
import { MediaKitResultView } from './media-kit/media-kit-result-view';
import { Input } from './ui/input';

const originToPathMap: Record<string, string> = {
  'Ideias de Vídeo': '/video-ideas',
  'Plano Semanal': '/generate-weekly-plan',
  'Mídia Kit & Prospecção': '/media-kit',
  'Propostas & Publis': '/publis-assistant',
};

const renderContent = (idea: IdeiaSalva) => {
    const props = {
        result: idea.aiResponseData,
        formValues: idea.aiResponseData.formValues,
        isSheetView: true,
    }

    switch(idea.origem) {
        case 'Ideias de Vídeo':
            return <VideoIdeasResultView {...props} />;
        case 'Propostas & Publis':
            return <PublisAssistantResultView {...props} />;
        case 'Mídia Kit & Prospecção':
            return <MediaKitResultView {...props} />;
        // case 'Plano Semanal':
        //     return <WeeklyPlanResultView {...props} />;
        default:
            return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{idea.conteudo}</p>;
    }
}

export function SavedIdeasSheet({ children, idea }: { children: React.ReactNode, idea: IdeiaSalva | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeiaSalva | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<IdeiaSalva | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    
  const filteredIdeas = useMemo(() => {
    if (!ideiasSalvas) return [];
    return ideiasSalvas.filter(idea => 
      idea.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ideiasSalvas, searchTerm]);
  
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
      // Close detail view if the deleted item was open
      if(selectedIdea?.id === ideaToDelete.id) {
        setIsDetailSheetOpen(false);
        setSelectedIdea(null);
      }
    } catch(e: any) {
        toast({
          title: "Erro ao Excluir",
          description: e.message,
          variant: "destructive"
        });
    }
  }

  const handleViewDetails = (idea: IdeiaSalva) => {
    setSelectedIdea(idea);
    setIsListSheetOpen(false); // Close list if it's open
    setIsDetailSheetOpen(true); // Open detail view
  };
  
  const trigger = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
          return React.cloneElement(child, {
              onClick: () => {
                  if (idea) {
                      handleViewDetails(idea);
                  } else {
                      setIsListSheetOpen(true);
                  }
              },
          } as React.HTMLAttributes<HTMLElement>);
      }
      return child;
  });


  return (
    <>
    <ResponsiveDialog isOpen={isListSheetOpen} onOpenChange={setIsListSheetOpen}>
        {!idea && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}
        <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="font-headline text-xl">Itens Salvos</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
                Acesse e pesquise todas as ideias e planos gerados pela IA que você salvou.
            </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="flex-1 py-4 border-y">
                 <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por título..."
                            className="pl-10 h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="h-96">
                <div className="px-6 space-y-4">
                    {isLoading && (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    )}

                    {!isLoading && filteredIdeas && filteredIdeas.length > 0 && (
                    <ul className="space-y-4">
                        {filteredIdeas.map((ideia) => (
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

                    {!isLoading && (!filteredIdeas || filteredIdeas.length === 0) && (
                    <div className="text-center py-20 px-4 rounded-xl bg-muted/50 border border-dashed">
                        <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-foreground">
                         {searchTerm ? "Nenhum resultado encontrado" : "Nenhum item salvo"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? "Tente uma busca diferente." : "Use as ferramentas de IA e salve seus resultados."}
                        </p>
                    </div>
                    )}
                </div>
                </ScrollArea>
            </div>
             <ResponsiveDialogFooter className="p-6 pt-4">
                <ResponsiveDialogClose asChild>
                    <Button type="button" variant="outline">Fechar</Button>
                </ResponsiveDialogClose>
            </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
    </ResponsiveDialog>
    
    <ResponsiveDialog isOpen={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        {idea && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}
        {selectedIdea && (
             <ResponsiveDialogContent className="sm:max-w-4xl p-0">
                 <ResponsiveDialogHeader className="p-6 border-b">
                    <ResponsiveDialogTitle className="font-headline text-xl">{selectedIdea.titulo}</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Salvo de "{selectedIdea.origem}" em {selectedIdea.createdAt.toDate().toLocaleDateString('pt-BR')}
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                 <ScrollArea className="max-h-[calc(100vh-12rem)]">
                    {renderContent(selectedIdea)}
                 </ScrollArea>
                  <ResponsiveDialogFooter className="p-6 pt-4 border-t flex justify-between">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                            <AlertDialogDescription>A ideia "{selectedIdea.titulo}" será removida permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                confirmDelete(selectedIdea);
                                handleDelete();
                            }}>Sim, Excluir</AlertDialogAction>
                            </AlertFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <ResponsiveDialogClose asChild>
                        <Button type="button" variant="outline">Fechar</Button>
                    </ResponsiveDialogClose>
                </ResponsiveDialogFooter>
             </ResponsiveDialogContent>
        )}
    </ResponsiveDialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
          <AlertDialogDescription>
            O item "{ideaToDelete?.titulo}" será removido permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertFooter>
          <AlertDialogCancel onClick={() => setIdeaToDelete(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            Sim, Excluir
          </AlertDialogAction>
        </AlertFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
