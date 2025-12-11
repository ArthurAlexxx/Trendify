
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { UserProfile, InstagramPostData, TikTokPost } from '@/lib/types';
import { Heart, MessageSquare, PlayCircle, AlertTriangle, Eye, Users } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

function MetricCard({ icon: Icon, title, value, isLoading }: { icon: React.ElementType, title: string, value?: string, isLoading: boolean }) {
    if (isLoading) {
        return (
             <div className="p-4 rounded-lg bg-muted/50 min-h-[88px] border">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-6 w-1/3" />
            </div>
        )
    }

    return (
        <div className="p-4 rounded-lg bg-muted/50 flex flex-col justify-center min-h-[88px] border">
            <div className="flex items-center justify-between space-y-0 pb-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                {title}
                </h3>
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <div className="text-2xl font-bold font-headline">
                    {value || '—'}
                </div>
            </div>
        </div>
    )
}

export function InstagramProfileResults({ profile, posts, error, formatIntegerValue }: { profile: Partial<UserProfile>, posts: InstagramPostData[] | null, error: string | null, formatIntegerValue: (n: any) => string }) {
    if (!profile) return null;

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bem-vindo, {profile.instagramHandle}!</CardTitle>
                    <CardDescription>Este é um resumo do seu perfil no Instagram.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={Users} title="Seguidores" value={profile.instagramFollowers} isLoading={false} />
                        <MetricCard icon={Eye} title="Média de Views" value={profile.instagramAverageViews} isLoading={false} />
                        <MetricCard icon={Heart} title="Média de Likes" value={profile.instagramAverageLikes} isLoading={false} />
                        <MetricCard icon={MessageSquare} title="Média de Comentários" value={profile.instagramAverageComments} isLoading={false} />
                    </div>
                </CardContent>
            </Card>

            {error && !posts && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao buscar posts</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {posts && posts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Seus últimos 10 posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {posts.slice(0, 10).map((post) => (
                                <Link key={post.id} href={`https://www.instagram.com/p/${post.shortcode}`} target="_blank" rel="noopener noreferrer">
                                    <Card className="overflow-hidden group cursor-pointer relative">
                                        <div className="relative aspect-[9/16]">
                                            <Image src={post.mediaUrl} alt={post.caption || 'Instagram Post'} fill style={{ objectFit: 'cover' }} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-white text-xs flex items-center gap-2">
                                                    <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatIntegerValue(post.likes)}</div>
                                                    <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {formatIntegerValue(post.comments)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function TikTokProfileResults({ profile, posts, error, formatIntegerValue, onVideoClick }: { profile: Partial<UserProfile>, posts: TikTokPost[] | null, error: string | null, formatIntegerValue: (n: any) => string, onVideoClick?: (post: TikTokPost) => void }) {
    if (!profile) return null;

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bem-vindo, {profile.tiktokHandle}!</CardTitle>
                    <CardDescription>Este é um resumo do seu perfil no TikTok.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={Users} title="Seguidores" value={profile.tiktokFollowers} isLoading={false} />
                        <MetricCard icon={Eye} title="Média de Views" value={profile.tiktokAverageViews} isLoading={false} />
                        <MetricCard icon={Heart} title="Média de Likes" value={profile.tiktokAverageLikes} isLoading={false} />
                        <MetricCard icon={MessageSquare} title="Média de Comentários" value={profile.tiktokAverageComments} isLoading={false} />
                    </div>
                </CardContent>
            </Card>

            {error && !posts && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao buscar vídeos</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            
            {posts && posts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Seus últimos 10 vídeos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {posts.slice(0, 10).map((post) => (
                                <div key={post.id} onClick={() => onVideoClick?.(post)} className="cursor-pointer">
                                    <Card className="overflow-hidden group relative">
                                        <div className="relative aspect-[9/16]">
                                            <Image src={post.coverUrl} alt={post.description || 'TikTok Video'} fill style={{ objectFit: 'cover' }} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircle className="h-10 w-10 text-white" />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatIntegerValue(post.views)}</div>
                                                    <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatIntegerValue(post.likes)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
