
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MoreHorizontal, CheckCircle, Tag, Info, Calendar, Lightbulb, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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

    const paginatedSavedIdeas = React.useMemo(() => {
        if (!ideiasSalvas) return [];
        const startIndex = (savedPage - 1) * ITEMS_PER_PAGE;
        return ideiasSalvas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [ideiasSalvas, savedPage]);

    const totalSavedPages = ideiasSalvas ? Math.ceil(ideiasSalvas.length / ITEMS_PER_PAGE) : 0;

    const paginatedCompletedIdeas = React.useMemo(() => {
        if (!completedIdeas) return [];
        const startIndex = (completedPage - 1) * ITEMS_PER_PAGE;
        return completedIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [completedIdeas, completedPage]);

    const totalCompletedPages = completedIdeas ? Math.ceil(completedIdeas.length / ITEMS_PER_PAGE) : 0;

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
                    <SavedIdeasSheet idea={ideia}>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Ver Detalhes</span>
                        </DropdownMenuItem>
                    </SavedIdeasSheet>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="salvos">Salvos</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
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
            <TabsContent value="salvos" className="h-full">
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
                  <p className="text-muted-foreground text-sm">Nenhum item salvo.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="concluidos" className="h-full">
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
                           Nenhuma tarefa concluída ainda.
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
