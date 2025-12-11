
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MoreHorizontal, CheckCircle, Tag, Info, Calendar, Lightbulb, Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  ConteudoAgendado,
  IdeiaSalva
} from '@/lib/types';
import { SavedIdeasSheet } from '../saved-ideas-sheet';
import React from 'react';
import { Input } from '../ui/input';
import { useRouter } from 'next/navigation';

interface ActionHubCardProps {
  isLoadingUpcoming: boolean;
  upcomingContent: ConteudoAgendado[] | null;
  isLoadingIdeias: boolean;
  ideiasSalvas: IdeiaSalva[] | null;
  completedIdeas: IdeiaSalva[] | null;
  isLoadingCompleted: boolean;
  handleToggleIdeia: (ideia: IdeiaSalva) => void;
  handleMarkAsPublished: (postId: string) => void;
}

const ITEMS_PER_PAGE = 3;

const originToPathMap: Record<string, string> = {
  'Ideias de Vídeo': '/video-ideas',
  'Plano Semanal': '/generate-weekly-plan',
  'Mídia Kit & Prospecção': '/media-kit',
  'Propostas & Publis': '/publis-assistant',
};

export default function ActionHubCard({
  isLoadingUpcoming,
  upcomingContent,
  isLoadingIdeias,
  ideiasSalvas,
  completedIdeas,
  isLoadingCompleted,
  handleToggleIdeia,
  handleMarkAsPublished,
}: ActionHubCardProps) {
    const [savedPage, setSavedPage] = React.useState(1);
    const [completedPage, setCompletedPage] = React.useState(1);
    const [savedSearchTerm, setSavedSearchTerm] = React.useState('');
    const [completedSearchTerm, setCompletedSearchTerm] = React.useState('');
    const router = useRouter();


    const handleViewDetails = (idea: IdeiaSalva) => {
        const path = originToPathMap[idea.origem];
        if (path) {
            localStorage.setItem('ai-result-to-view', JSON.stringify(idea));
            router.push(path);
        } else {
            // Fallback for ideas without a specific page, like older ones
            alert("Não foi possível encontrar a página de origem para esta ideia.");
        }
    }

    const filteredSavedIdeas = React.useMemo(() => {
        if (!ideiasSalvas) return [];
        return ideiasSalvas.filter(idea => 
            idea.titulo.toLowerCase().includes(savedSearchTerm.toLowerCase())
        );
    }, [ideiasSalvas, savedSearchTerm]);

    const paginatedSavedIdeas = React.useMemo(() => {
        const startIndex = (savedPage - 1) * ITEMS_PER_PAGE;
        return filteredSavedIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredSavedIdeas, savedPage]);

    const totalSavedPages = Math.ceil(filteredSavedIdeas.length / ITEMS_PER_PAGE);
    
    React.useEffect(() => {
        setSavedPage(1);
    }, [savedSearchTerm]);


    const filteredCompletedIdeas = React.useMemo(() => {
        if (!completedIdeas) return [];
        return completedIdeas.filter(idea => 
            idea.titulo.toLowerCase().includes(completedSearchTerm.toLowerCase())
        );
    }, [completedIdeas, completedSearchTerm]);

    const paginatedCompletedIdeas = React.useMemo(() => {
        const startIndex = (completedPage - 1) * ITEMS_PER_PAGE;
        return filteredCompletedIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCompletedIdeas, completedPage]);

    const totalCompletedPages = Math.ceil(filteredCompletedIdeas.length / ITEMS_PER_PAGE);
    
    React.useEffect(() => {
        setCompletedPage(1);
    }, [completedSearchTerm]);


    const renderIdeiaItem = (ideia: IdeiaSalva, isCompletedTab: boolean) => (
         <div
            key={ideia.id}
            className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"
        >
            <div className="flex items-start gap-4 flex-1 overflow-hidden">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className={cn("font-semibold text-foreground truncate text-sm", isCompletedTab && "line-through text-muted-foreground")}>
                        {ideia.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {isCompletedTab ? 'Concluído' : 'Salvo'}{' '}
                        {formatDistanceToNow(ideia.createdAt.toDate(), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                    </p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   <DropdownMenuItem onSelect={() => handleViewDetails(ideia)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Ver Detalhes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleToggleIdeia(ideia)}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>{isCompletedTab ? "Marcar como Não Concluído" : "Marcar como Concluído"}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )

  return (
    <Card className="h-full flex flex-col shadow-primary-lg">
      <CardHeader>
        <CardTitle className="text-center font-headline text-lg flex items-center justify-center gap-2">
          Hub de Ação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="salvos" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
            <TabsTrigger value="salvos" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Salvos</TabsTrigger>
            <TabsTrigger value="calendario" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Calendário</TabsTrigger>
            <TabsTrigger value="concluidos" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5">Concluídos</TabsTrigger>
          </TabsList>
          <div className="flex-1 mt-4">
            <TabsContent value="calendario" className="h-full">
              {isLoadingUpcoming ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : upcomingContent && upcomingContent.length > 0 ? (
                <div className="space-y-2">
                  {upcomingContent.map((post: ConteudoAgendado) => (
                    <div
                      key={post.id}
                      className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 overflow-hidden">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-semibold text-foreground truncate text-sm">
                            {post.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {post.contentType} •{' '}
                            {formatDistanceToNow(post.date.toDate(), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleMarkAsPublished(post.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Marcar como Publicado</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                   <div className="pt-2">
                        <Button variant="link" className="w-full" asChild>
                            <Link href="/content-calendar">Ver calendário completo</Link>
                        </Button>
                    </div>
                </div>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Nenhum post agendado.
                  </p>
                  <Button variant="link" asChild>
                    <Link href="/content-calendar">Ir para o Calendário</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="salvos" className="h-full flex flex-col gap-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar itens salvos..."
                        className="pl-10 h-10"
                        value={savedSearchTerm}
                        onChange={(e) => setSavedSearchTerm(e.target.value)}
                    />
                </div>

              {isLoadingIdeias ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paginatedSavedIdeas && paginatedSavedIdeas.length > 0 ? (
                <div className="space-y-2">
                  {paginatedSavedIdeas.map(ideia => renderIdeiaItem(ideia, false))}
                  {totalSavedPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setSavedPage(p => Math.max(1, p - 1))} disabled={savedPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="text-xs text-muted-foreground">Pág {savedPage} de {totalSavedPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setSavedPage(p => Math.min(totalSavedPages, p + 1))} disabled={savedPage === totalSavedPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-sm">{savedSearchTerm ? "Nenhum item encontrado." : "Nenhum item salvo."}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="concluidos" className="h-full flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar itens concluídos..."
                        className="pl-10 h-10"
                        value={completedSearchTerm}
                        onChange={(e) => setCompletedSearchTerm(e.target.value)}
                    />
                  </div>
                 {isLoadingCompleted ? (
                    <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                 ) : paginatedCompletedIdeas && paginatedCompletedIdeas.length > 0 ? (
                    <div className="space-y-2">
                     {paginatedCompletedIdeas.map(ideia => renderIdeiaItem(ideia, true))}
                     {totalCompletedPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => Math.max(1, p - 1))} disabled={completedPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-xs text-muted-foreground">Pág {completedPage} de {totalCompletedPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))} disabled={completedPage === totalCompletedPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    )}
                    </div>
                ) : (
                    <div className="text-center h-full flex flex-col items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                           {completedSearchTerm ? "Nenhum item encontrado." : "Nenhuma tarefa concluída ainda."}
                        </p>
                    </div>
                )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
