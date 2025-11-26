
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { User as UserIcon, Instagram, Film, Search, Loader2, AlertTriangle, Users, Heart, MessageSquare, Clapperboard, PlayCircle, Eye, Upload, Crown, Check, RefreshCw, Link2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import type { UserProfile, InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPostData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getInstagramProfile, getTikTokPosts, getTikTokProfile, getInstagramPosts } from '@/app/(app)/profile/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { useRouter } from 'next/navigation';
import { isToday } from 'date-fns';


const profileFormSchema = z.object({
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  instagramProfile: z.custom<InstagramProfileData>().optional(),
  instagramPosts: z.custom<InstagramPostData[]>().optional(),
  tiktokProfile: z.custom<TikTokProfileData>().optional(),
  tiktokPosts: z.custom<TikTokPostData[]>().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export default function IntegrationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';
  const router = useRouter();
  
  const [instaStatus, setInstaStatus] = useState<SearchStatus>('idle');
  const [instaError, setInstaError] = useState<string | null>(null);

  const [tiktokStatus, setTiktokStatus] = useState<SearchStatus>('idle');
  const [tiktokError, setTiktokError] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      instagramHandle: '',
      tiktokHandle: '',
    },
  });
  
  const instaAlreadySyncedToday = !!userProfile?.lastInstagramSync && isToday(userProfile.lastInstagramSync.toDate());
  const tiktokAlreadySyncedToday = !!userProfile?.lastTikTokSync && isToday(userProfile.lastTikTokSync.toDate());
  
  useEffect(() => {
    if (userProfile) {
      form.reset({
        instagramHandle: userProfile.instagramHandle || '',
        tiktokHandle: userProfile.tiktokHandle || '',
      });
    }
  }, [userProfile, form]);
  
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
    if (num >= 1000) return num.toLocaleString('pt-BR');
    return String(num);
  };


  const handleInstagramSearch = async () => {
    const username = form.getValues('instagramHandle') || '';
    if (!username) {
      toast({ title: 'Atenção', description: 'Por favor, insira um nome de usuário do Instagram.', variant: 'destructive'});
      return;
    }
    setInstaStatus('loading');
    setInstaError(null);
    form.setValue('instagramProfile', undefined);
    form.setValue('instagramPosts', undefined);

    const cleanedUsername = username.replace('@', '');

    try {
      const [profileResult, postsResult] = await Promise.all([
        getInstagramProfile(cleanedUsername),
        getInstagramPosts(cleanedUsername)
      ]);
      
       const videoPosts = postsResult.filter(p => p.is_video && p.video_view_count);
       const averageViews = videoPosts.length > 0 ? videoPosts.reduce((acc, p) => acc + (p.video_view_count ?? 0), 0) / videoPosts.length : 0;
       const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
       const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;

        form.setValue('instagramProfile', profileResult);
        form.setValue('instagramPosts', postsResult);
        form.setValue('instagramHandle', `@${profileResult.username}`);
        
        if (user && userProfileRef) {
          const dataToSave: Partial<UserProfile> = {
             instagramHandle: `@${profileResult.username}`,
             bio: userProfile?.bio || profileResult.biography,
             photoURL: userProfile?.photoURL || profileResult.profilePicUrlHd,
             instagramFollowers: formatNumber(profileResult.followersCount),
             instagramAverageViews: formatNumber(Math.round(averageViews)),
             instagramAverageLikes: formatNumber(Math.round(averageLikes)),
             instagramAverageComments: formatNumber(Math.round(averageComments)),
             lastInstagramSync: serverTimestamp() as any,
          };
           Object.keys(dataToSave).forEach(keyStr => {
            const key = keyStr as keyof typeof dataToSave;
            if (dataToSave[key] === undefined) {
                (dataToSave as any)[key] = null;
            }
          });
          await updateDoc(userProfileRef, dataToSave);
          
          const metricSnapshotsRef = collection(firestore, `users/${user.uid}/metricSnapshots`);
          await addDoc(metricSnapshotsRef, {
            userId: user.uid,
            date: serverTimestamp(),
            platform: 'instagram',
            followers: dataToSave.instagramFollowers || '0',
            views: dataToSave.instagramAverageViews || '0',
            likes: dataToSave.instagramAverageLikes || '0',
            comments: dataToSave.instagramAverageComments || '0',
          });
        }
        
        setInstaStatus('success');
        toast({
          title: 'Sucesso!',
          description: 'Sua conta do Instagram foi sincronizada.',
        });

    } catch (e: any) {
      setInstaError(e.message || 'Ocorreu um erro desconhecido.');
      setInstaStatus('error');
      toast({
        title: 'Erro na Sincronização',
        description: e.message || 'Ocorreu um erro desconhecido.',
        variant: 'destructive',
      });
    }
  };

    const handleTiktokSearch = async () => {
    const tiktokUsername = form.getValues('tiktokHandle') || '';
    if (!tiktokUsername) {
      toast({ title: 'Atenção', description: 'Por favor, insira um nome de usuário do TikTok.', variant: 'destructive'});
      return;
    }
    setTiktokStatus('loading');
    setTiktokError(null);
    form.setValue('tiktokProfile', undefined);
    form.setValue('tiktokPosts', undefined);

    const cleanedUsername = tiktokUsername.replace('@', '');

    try {
      const profileResult = await getTikTokProfile(cleanedUsername);
      
      let fetchedPosts: TikTokPostData[] = [];
      try {
          fetchedPosts = await getTikTokPosts(cleanedUsername);
      } catch(postsError: any) {
          setTiktokError('Perfil encontrado, mas não foi possível carregar os vídeos recentes. ' + postsError.message);
      }

        const averageLikes = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.likes, 0) / fetchedPosts.length : 0;
        const averageComments = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.comments, 0) / fetchedPosts.length : 0;
        const averageViews = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.views, 0) / fetchedPosts.length : 0;

        form.setValue('tiktokProfile', profileResult);
        form.setValue('tiktokPosts', fetchedPosts);
        form.setValue('tiktokHandle', `@${profileResult.username}`);
       
        if (user && userProfileRef) {
          const dataToSave: Partial<UserProfile> = {
             tiktokHandle: `@${profileResult.username}`,
             photoURL: userProfile?.photoURL || profileResult.avatarUrl,
             bio: userProfile?.bio || profileResult.bio,
             tiktokFollowers: formatNumber(profileResult.followersCount),
             tiktokAverageLikes: formatNumber(Math.round(averageLikes)),
             tiktokAverageComments: formatNumber(Math.round(averageComments)),
             tiktokAverageViews: formatNumber(Math.round(averageViews)),
             lastTikTokSync: serverTimestamp() as any,
          };
           Object.keys(dataToSave).forEach(keyStr => {
            const key = keyStr as keyof typeof dataToSave;
            if (dataToSave[key] === undefined) {
                (dataToSave as any)[key] = null;
            }
          });
          await updateDoc(userProfileRef, dataToSave);
          
          const metricSnapshotsRef = collection(firestore, `users/${user.uid}/metricSnapshots`);
          await addDoc(metricSnapshotsRef, {
            userId: user.uid,
            date: serverTimestamp(),
            platform: 'tiktok',
            followers: dataToSave.tiktokFollowers || '0',
            views: dataToSave.tiktokAverageViews || '0',
            likes: dataToSave.tiktokAverageLikes || '0',
            comments: dataToSave.tiktokAverageComments || '0',
          });
        }
        setTiktokStatus('success');
        toast({
          title: 'Sucesso!',
          description: 'Sua conta do TikTok foi sincronizada.',
        });

    } catch (e: any) {
      setTiktokError(e.message || 'Ocorreu um erro desconhecido.');
      setTiktokStatus('error');
      toast({
        title: 'Erro na Sincronização',
        description: e.message || 'Ocorreu um erro desconhecido.',
        variant: 'destructive',
      });
    }
  };


  const isLoading = isProfileLoading || isSubscriptionLoading;


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Integração de Plataformas"
          description="Sincronize seus dados do Instagram e TikTok para obter métricas automáticas."
        />
         <Button variant="ghost" asChild>
          <Link href="/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Perfil
          </Link>
        </Button>
      </div>
          
          <Card className="rounded-2xl border-0">
            <CardContent className="pt-6 space-y-6">
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : isPremium ? (
                <>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Importante!</AlertTitle>
                    <AlertDescription>
                        Para a integração automática funcionar, sua conta do Instagram deve ser pública e estar configurada como {"'Comercial'"} ou {"'Criador de Conteúdo'"}. A integração com TikTok funciona com qualquer conta pública.
                    </AlertDescription>
                  </Alert>

                  <Tabs defaultValue="instagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="instagram"><Instagram className="mr-2 h-4 w-4" /> Instagram</TabsTrigger>
                        <TabsTrigger value="tiktok"><Film className="mr-2 h-4 w-4" /> TikTok</TabsTrigger>
                    </TabsList>
                    <TabsContent value="instagram" className="mt-4">
                        <Card className='border-0 shadow-none'>
                            <CardContent className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex flex-col sm:flex-row items-end gap-4">
                                <div className="flex-1 w-full">
                                <Label htmlFor="instagramHandleApi">Usuário do Instagram</Label>
                                <Input
                                    id="instagramHandleApi"
                                    placeholder="@seu_usuario"
                                    {...form.register('instagramHandle')}
                                    className="h-11 mt-1"
                                />
                                </div>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        disabled={instaStatus === 'loading' || !form.watch('instagramHandle') || instaAlreadySyncedToday}
                                        className="w-full sm:w-auto"
                                    >
                                        {
                                         instaStatus === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> :
                                         userProfile?.instagramHandle ? <><RefreshCw className="mr-2 h-4 w-4" />Sincronizar Dados</> : 
                                         <><Search className="mr-2 h-4 w-4" />Buscar Dados</>}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você confirma que é o proprietário ou tem permissão para buscar os dados do perfil <strong>@{form.watch('instagramHandle')?.replace('@', '')}</strong>?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleInstagramSearch}>Sim, confirmar e buscar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <p className='text-xs text-muted-foreground mt-2'>
                                {instaAlreadySyncedToday 
                                    ? 'Você já sincronizou hoje. Volte amanhã para uma nova atualização.'
                                    : 'Isso irá buscar e preencher sua foto, @, bio e métricas de seguidores, curtidas e comentários.'
                                }
                            </p>
                            </CardContent>
                        </Card>
                         {instaStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                         {instaStatus === 'error' && instaError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{instaError}</AlertDescription></Alert>}
                         {instaStatus === 'success' && <InstagramProfileResults profile={form.watch('instagramProfile')!} posts={form.watch('instagramPosts') ?? null} formatNumber={formatNumber} error={instaError} />}
                    </TabsContent>
                    <TabsContent value="tiktok" className="mt-4">
                        <Card className='border-0 shadow-none'>
                            <CardContent className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex flex-col sm:flex-row items-end gap-4">
                                <div className="flex-1 w-full">
                                <Label htmlFor="tiktokHandleApi">Usuário do TikTok</Label>
                                <Input
                                    id="tiktokHandleApi"
                                    placeholder="@seu_usuario"
                                    {...form.register('tiktokHandle')}
                                    className="h-11 mt-1"
                                />
                                </div>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button
                                        type="button"
                                        disabled={tiktokStatus === 'loading' || !form.watch('tiktokHandle') || tiktokAlreadySyncedToday}
                                        className="w-full sm:w-auto"
                                    >
                                        {
                                         tiktokStatus === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> :
                                         userProfile?.tiktokHandle ? <><RefreshCw className="mr-2 h-4 w-4" />Sincronizar Dados</> : 
                                         <><Search className="mr-2 h-4 w-4" />Buscar Dados</>}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você confirma que é o proprietário ou tem permissão para buscar os dados do perfil <strong>@{form.watch('tiktokHandle')?.replace('@', '')}</strong>?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleTiktokSearch}>Sim, confirmar e buscar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <p className='text-xs text-muted-foreground mt-2'>
                                {tiktokAlreadySyncedToday 
                                    ? 'Você já sincronizou hoje. Volte amanhã para uma nova atualização.'
                                    : 'Isso irá buscar e preencher sua foto, @, bio e métricas do TikTok.'
                                }
                            </p>
                            </CardContent>
                        </Card>
                         {tiktokStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                         {tiktokStatus === 'error' && tiktokError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{tiktokError}</AlertDescription></Alert>}
                         {tiktokStatus === 'success' && <TikTokProfileResults profile={form.watch('tiktokProfile')!} posts={form.watch('tiktokPosts') ?? null} formatNumber={formatNumber} error={tiktokError} />}
                    </TabsContent>
                  </Tabs>
                </>
                ) : (
                    <Card className="border-yellow-400/50 bg-yellow-400/5 rounded-2xl text-center">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-3 font-headline text-xl text-yellow-600">
                                <Crown className="h-6 w-6" />
                                <span>Recurso Premium</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">A integração automática com redes sociais é um recurso exclusivo para assinantes do plano Premium.</p>
                            <Button asChild>
                                <Link href="/subscribe">Ver Planos</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
          </Card>
    </div>
  );
}
