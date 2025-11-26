
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import type { InstagramProfileData, TikTokProfileData, InstagramPostData, TikTokPostData } from '@/lib/types';
import { Heart, MessageSquare, PlayCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function MetricCard({ icon: Icon, title, value, handle, isLoading, isManual }: { icon: React.ElementType, title: string, value?: string, handle?: string, isLoading: boolean, isManual?: boolean }) {
    if (isLoading) {
        return (
             <div className="p-6 rounded-lg bg-muted/50">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-8 w-1/4" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 rounded-lg bg-muted/50 flex flex-col justify-center text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <h3 className="text-sm sm:text-base font-medium text-muted-foreground">
                {title}
                </h3>
                <Icon className="h-4 w-4 text-primary" />
            </div>
            {(isManual && (!value || value === "N/A")) ? (
                    <div className="flex items-center gap-2 mt-1">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <Link href="/profile" className="text-sm text-muted-foreground hover:underline">
                        Atualize no perfil
                    </Link>
                </div>
            ) : (
                <>
                    <div className="text-2xl sm:text-3xl font-bold font-headline">
                        {value || '—'}
                    </div>
                    {handle && (
                        <p className="text-xs text-muted-foreground truncate">
                            {handle ? handle : <Link href="/profile" className="hover:underline">Adicionar no perfil</Link>}
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

export function InstagramProfileResults({ profile, posts, error, formatNumber }: { profile: Partial<InstagramProfileData>, posts: InstagramPostData[] | null, error: string | null, formatNumber: (n: number) => string }) {
    if (!profile) return null;

    return (
        <div className="mt-6 space-y-6">
            <h3 className="text-lg font-semibold text-center sm:text-left">Últimas Publicações</h3>
            {error && !posts && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao buscar posts</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            {posts && posts.length > 0 ? (
                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {posts.map((post) => (
                            <CarouselItem key={post.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                                <Card className="overflow-hidden">
                                    <div className="relative aspect-[9/16]">
                                        <Image src={post.mediaUrl} alt={post.caption || 'Instagram Post'} fill style={{ objectFit: 'cover' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-4 text-white">
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {formatNumber(post.likes)}</div>
                                                <div className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> {formatNumber(post.comments)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="ml-12 hidden sm:flex" />
                    <CarouselNext className="mr-12 hidden sm:flex" />
                </Carousel>
            ) : posts ? (
                 <div className="text-center py-10">
                    <p className="text-muted-foreground">Nenhuma publicação recente encontrada para este perfil.</p>
                </div>
            ) : null}
        </div>
    );
}

export function TikTokProfileResults({ profile, posts, error, formatNumber }: { profile: Partial<TikTokProfileData>, posts: TikTokPostData[] | null, error: string | null, formatNumber: (n: number) => string }) {
    if (!profile) return null;
    
    return (
        <div className="mt-6 space-y-6">
            <h3 className="text-lg font-semibold text-center sm:text-left">Últimos Vídeos</h3>
            {error && !posts && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Vídeos</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            
            {posts && posts.length > 0 ? (
                <Carousel opts={{ align: "start" }} className="w-full">
                    <CarouselContent>
                        {posts.map((post) => (
                            <CarouselItem key={post.id} className="basis-full sm:basis-1/3 lg:basis-1/4">
                                <Card className="overflow-hidden">
                                    <div className="relative aspect-[9/16]">
                                        <Image src={post.coverUrl} alt={post.description || 'TikTok Video'} fill style={{ objectFit: 'cover' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-4 text-white">
                                            <div className="flex flex-col gap-2 text-xs">
                                                <div className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4" /> {formatNumber(post.views)}</div>
                                                <div className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {formatNumber(post.likes)}</div>
                                                <div className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> {formatNumber(post.comments)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                     <CarouselPrevious className="ml-12 hidden sm:flex" />
                    <CarouselNext className="mr-12 hidden sm:flex" />
                </Carousel>
            ) : posts ? (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">Nenhum vídeo recente encontrado para este perfil.</p>
                </div>
            ) : null}
        </div>
    );
}
    