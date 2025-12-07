
'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogTrigger, ResponsiveDialogFooter, ResponsiveDialogClose } from '@/components/ui/responsive-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { IdeiaSalva, PlanoSemanal, ItemRoteiro } from '@/lib/types';
import { collection, orderBy, query, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { BookMarked, Eye, Inbox, Loader2, Edit, Calendar, Trash2, Zap, Newspaper, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VideoIdeasResultView } from '@/app/(app)/video-ideas/page';
import { PublisAssistantResultView } from '@/app/(app)/publis-assistant/page';
import { MediaKitResultView } from '@/app/(app)/media-kit/page';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PreviousPlansSheet } from './previous-plans-sheet'; // Importação circular pode ser um problema.

export function SavedIdeasSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<IdeiaSalva | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeiaSalva | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivating, startActivatingTransition] = useTransition();

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
       if (selectedIdea?.id === ideaToDelete.id) {
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
  
  const getActionInfo = (idea: IdeiaSalva | null): { href: string; label: string; icon: React.ElementType, isSpecialAction?: boolean } => {
    if (!idea) return { href: '/', label: 'Ação', icon: Edit };
    
    const aiData = idea.aiResponseData;

    switch (idea.origem) {
      case 'Ideias de Vídeo':
        const topic = encodeURIComponent(aiData?.script?.gancho || idea.titulo);
        const audience = encodeURIComponent(aiData?.targetAudience || '');
        return { href: `/video-ideas?topic=${topic}&targetAudience=${audience}`, label: 'Refinar Ideia', icon: Edit };
      
      case 'Propostas & Publis':
         const product = encodeURIComponent(aiData?.product || idea.titulo);
         const diff = encodeURIComponent(aiData?.differentiators || '');
         const target = encodeURIComponent(aiData?.targetAudience || '');
         return { href: `/publis-assistant?product=${product}&differentiators=${diff}&targetAudience=${target}`, label: 'Refinar Publi', icon: Edit };
      
      case 'Mídia Kit & Prospecção':
        const targetBrand = encodeURIComponent(aiData?.targetBrand || '');
        const valueProposition = encodeURIComponent(aiData?.valueProposition || '');
        const audienceFromProfile = encodeURIComponent(aiData?.audience || '');
        return { href: `/publis-assistant?product=${targetBrand}&differentiators=${valueProposition}&targetAudience=${audienceFromProfile}`, label: 'Criar Publi para Marca', icon: Newspaper };
      
      case 'Plano Semanal':
        return { href: '#', label: 'Reativar Plano', icon: History, isSpecialAction: true };

      default:
        return { href: '/dashboard', label: 'Ir para o Dashboard', icon: Edit };
    }
  }
  
  const actionInfo = getActionInfo(selectedIdea);

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
            return <MediaKitResultView result={idea.aiResponseData} formValues={{ targetBrand: idea.aiResponseData?.targetBrand || idea.titulo, niche: 'N/A', keyMetrics: 'N/A' }} isSheetView={true} />;
        default:
            return <p className="text-muted-foreground p-6 whitespace-pre-wrap">{idea.conteudo}</p>;
    }
  }


  return (
    <>
    <ResponsiveDialog isOpen={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <ResponsiveDialogTrigger>
            <Button variant="outline">
                <BookMarked className="mr-2 h-4 w-4" />
                Ideias Salvas
            </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="p-0 sm:max-w-lg">
            <ResponsiveDialogHeader className='p-6 pb-4 border-b'>
            <ResponsiveDialogTitle className="font-headline text-xl">Ideias Salvas</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
                Acesse aqui todas as ideias geradas pela IA que você salvou.
            </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ScrollArea className="flex-1 max-h-[calc(100vh-10rem)]">
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
        </ResponsiveDialogContent>
    </ResponsiveDialog>
    
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

    {selectedIdea && (
        <ResponsiveDialog isOpen={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <ResponsiveDialogContent className="p-0 sm:max-w-3xl flex flex-col">
                <ResponsiveDialogHeader className='p-6 pb-4 border-b'>
                <ResponsiveDialogTitle className="font-headline text-2xl">
                    {selectedIdea.titulo}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                   Gerado em {selectedIdea.origem}
                 </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ScrollArea className="flex-1">
                 {renderResultView(selectedIdea)}
                </ScrollArea>
                 <ResponsiveDialogFooter className="p-4 border-t flex flex-col sm:flex-row gap-2 justify-end">
                    {actionInfo.isSpecialAction ? (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="outline" className="w-full sm:w-auto" disabled={isActivating}>
                                   {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <actionInfo.icon className="mr-2 h-4 w-4" />} 
                                   {actionInfo.label}
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Reativar este plano?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    O plano semanal ativo será arquivado e este se tornará o principal. Deseja continuar?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleActivatePlan(selectedIdea)}>
                                    Sim, Reativar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <Link href={actionInfo.href} className={cn(buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' }))}>
                            <actionInfo.icon className="mr-2 h-4 w-4" /> {actionInfo.label}
                        </Link>
                    )}
                    <Link href={`/content-calendar?title=${encodeURIComponent(selectedIdea.titulo)}&notes=${encodeURIComponent(selectedIdea.conteudo)}`}
                         className={cn(buttonVariants({ variant: 'default', className: 'w-full sm:w-auto' }))}>
                       <Calendar className="mr-2 h-4 w-4" />
                       Agendar Post
                    </Link>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )}
    </>
  );
}
