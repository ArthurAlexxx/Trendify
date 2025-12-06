'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { InstagramProfileData, TikTokProfileData, InstagramPostData, TikTokPostData } from '@/lib/types';
import { Heart, MessageSquare, PlayCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function MetricCard({ icon: Icon, title, value, handle, isLoading }: { icon: React.ElementType, title: string, value?: string, handle?: string, isLoading: boolean }) {
    if (isLoading) {
        return (
             <div className="p-4 rounded-lg bg-muted/50 min-h-[108px]">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-7 w-1/3" />
            </div>
        )
    }

    return (
        <div className="p-4 rounded-lg bg-muted/50 flex flex-col justify-center min-h-[108px]">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                {title}
                </h3>
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <div className="text-2xl font-bold font-headline">
                    {value || '—'}
                </div>
                {handle && (
                    <p className="text-xs text-muted-foreground truncate">
                        {handle ? handle : <Link href="/profile" className="hover:underline">Adicionar no perfil</Link>}
                    </p>
                )}
            </div>
        </div>
    )
}

export function InstagramProfileResults({ profile, posts, error, formatNumber }: { profile: Partial<InstagramProfileData>, posts: InstagramPostData[] | null, error: string | null, formatNumber: (n: number) => string }) {
    if (!profile) return null;

    return (
        <div className="mt-4 space-y-4">
            {error && !posts && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao buscar posts</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            {posts && posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {posts.slice(0, 10).map((post) => (
                        <div key={post.id}>
                            <Link href={`https://www.instagram.com/p/${post.shortcode}`} target="_blank" rel="noopener noreferrer">
                                <Card className="overflow-hidden group cursor-pointer">
                                    <div className="relative aspect-[9/16]">
                                        <Image src={post.mediaUrl} alt={post.caption || 'Instagram Post'} fill style={{ objectFit: 'cover' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatNumber(post.likes)}</div>
                                                <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {formatNumber(post.comments)}</div>
                                                {post.is_video && <div className="flex items-center gap-1.5"><PlayCircle className="h-3 w-3" /> {formatNumber(post.video_view_count ?? 0)}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : posts ? (
                 <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Nenhuma publicação recente encontrada para este perfil.</p>
                </div>
            ) : null}
        </div>
    );
}

export function TikTokProfileResults({ profile, posts, error, formatNumber, onVideoClick }: { profile: Partial<TikTokProfileData>, posts: TikTokPostData[] | null, error: string | null, formatNumber: (n: number) => string, onVideoClick?: (post: TikTokPostData) => void }) {
    if (!profile) return null;
    
    return (
        <div className="mt-4 space-y-4">
            {error && !posts && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Vídeos</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            
            {posts && posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {posts.slice(0, 10).map((post) => (
                        <div key={post.id} onClick={() => onVideoClick?.(post)} className="cursor-pointer">
                            <Card className="overflow-hidden group">
                                <div className="relative aspect-[9/16]">
                                    <Image src={post.coverUrl} alt={post.description || 'TikTok Video'} fill style={{ objectFit: 'cover' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center">
                                        <PlayCircle className="h-10 w-10 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1"><PlayCircle className="h-3 w-3" /> {formatNumber(post.views)}</div>
                                            <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatNumber(post.likes)}</div>
                                            <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {formatNumber(post.comments)}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : posts ? (
                <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Nenhum vídeo recente encontrado para este perfil.</p>
                </div>
            ) : null}
        </div>
    );
}
