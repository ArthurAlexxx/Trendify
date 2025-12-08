
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MoreHorizontal, CheckCircle, Tag, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RecentPostsSheet } from '@/components/dashboard/recent-posts-sheet';
import type {
  ConteudoAgendado,
  IdeiaSalva,
  InstagramPostData,
  TikTokPost,
  UserProfile,
} from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ActionHubCardProps {
  isLoadingUpcoming: boolean;
  upcomingContent: ConteudoAgendado[] | null;
  isLoadingIdeias: boolean;
  ideiasSalvas: IdeiaSalva[] | null;
  isFetchingPosts: boolean;
  instaProfile: UserProfile | null;
  instaPosts: InstagramPostData[] | null;
  tiktokProfile: UserProfile | null;
  tiktokPosts: TikTokPost[] | null;
  handleToggleIdeia: (ideia: IdeiaSalva) => void;
  handleMarkAsPublished: (postId: string) => void;
  handleTikTokClick: (post: TikTokPost) => void;
  formatNumber: (num: number) => string;
}

export function ActionHubCard({
  isLoadingUpcoming,
  upcomingContent,
  isLoadingIdeias,
  ideiasSalvas,
  isFetchingPosts,
  instaProfile,
  instaPosts,
  tiktokProfile,
  tiktokPosts,
  handleToggleIdeia,
  handleMarkAsPublished,
  handleTikTokClick,
  formatNumber,
}: ActionHubCardProps) {
  return (
    <Card className="h-full flex flex-col shadow-primary-lg">
      <CardHeader>
        <CardTitle className="text-center font-headline text-xl flex items-center justify-center gap-2">
          Hub de Ação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="proximos" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="proximos">Próximos</TabsTrigger>
            <TabsTrigger value="ideias">Ideias</TabsTrigger>
            <TabsTrigger value="posts">Recentes</TabsTrigger>
          </TabsList>
          <div className="flex-1 mt-4">
            <TabsContent value="proximos" className="h-full">
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
            <TabsContent value="ideias" className="h-full">
              {isLoadingIdeias ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : ideiasSalvas && ideiasSalvas.length > 0 ? (
                <ul className="space-y-3">
                  {ideiasSalvas.map((ideia: IdeiaSalva) => (
                    <li key={ideia.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`ideia-${ideia.id}`}
                        checked={ideia.concluido}
                        onCheckedChange={() => handleToggleIdeia(ideia)}
                        className="h-5 w-5 mt-0.5"
                      />
                      <div className="grid gap-0.5">
                        <label
                          htmlFor={`ideia-${ideia.id}`}
                          className={cn(
                            'font-medium transition-colors cursor-pointer',
                            ideia.concluido
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {ideia.titulo}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          de "{ideia.origem}"
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma ideia salva.
                  </p>
                  <Button variant="link" asChild>
                    <Link href="/video-ideas">Gerar Novas Ideias</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="posts" className="h-full">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-muted-foreground text-sm mb-2">
                  Veja os posts sincronizados de suas plataformas.
                </p>
                <RecentPostsSheet
                  instaProfile={instaProfile}
                  instaPosts={instaPosts}
                  tiktokProfile={tiktokProfile}
                  tiktokPosts={tiktokPosts}
                  isLoading={isFetchingPosts}
                  formatNumber={formatNumber}
                  onTikTokClick={handleTikTokClick}
                >
                  <Button variant="outline">Ver Posts Sincronizados</Button>
                </RecentPostsSheet>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
