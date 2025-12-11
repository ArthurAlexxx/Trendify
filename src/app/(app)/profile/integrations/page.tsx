

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
import { useResponsiveToast } from '@/hooks/use-responsive-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs, Timestamp, writeBatch, setDoc } from 'firebase/firestore';
import type { UserProfile, InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPost } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getInstagramProfile, getTikTokProfile, getInstagramPosts, getTikTokPosts } from '@/app/(app)/profile/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { useRouter } from 'next/navigation';
import { CodeBlock } from '@/components/ui/code-block';
import { Dialog } from '@/components/ui/dialog';
import { DialogContent } from '@radix-ui/react-dialog';


const profileFormSchema = z.object({
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  instagramProfile: z.custom<InstagramProfileData>().optional(),
  instagramPosts: z.custom<InstagramPostData[]>().optional(),
  tiktokProfile: z.custom<TikTokProfileData>().optional(),
  tiktokPosts: z.custom<TikTokPost[]>().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export default function IntegrationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useResponsiveToast();
  const router = useRouter();
  
  const [instaStatus, setInstaStatus] = useState<SearchStatus>('idle');
  const [instaError, setInstaError] = useState<string | null>(null);

  const [tiktokStatus, setTiktokStatus] = useState<SearchStatus>('idle');
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokRawResponse, setTiktokRawResponse] = useState<string | null>(null);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [currentTikTokUrl, setCurrentTikTokUrl] = useState('');


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

  const updateOrCreateMetricSnapshot = async (platform: 'instagram' | 'tiktok', data: any) => {
    if (!user || !firestore) return;
  
    const todayDateString = new Date().toISOString().split('T')[0];
    const snapshotDocRef = doc(firestore, `users/${user.uid}/metricSnapshots`, `${platform}_${todayDateString}`);
  
    const snapshotData = {
      date: serverTimestamp(),
      platform,
      followers: data.followers || '0',
      views: data.views || '0',
      likes: data.likes || '0',
      comments: data.comments || '0',
    };
  
    await setDoc(snapshotDocRef, snapshotData, { merge: true });
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

       const fullPostsData: InstagramPostData[] = postsResult.map(p => ({
            ...p,
            fetchedAt: Timestamp.now(),
        }));

        form.setValue('instagramProfile', profileResult);
        form.setValue('instagramPosts', fullPostsData);
        form.setValue('instagramHandle', `@${profileResult.username}`);
        
        if (user && userProfileRef && firestore) {
          const batch = writeBatch(firestore);

          const dataToSave = {
             instagramHandle: `@${profileResult.username}`,
             bio: userProfile?.bio || profileResult.biography,
             photoURL: userProfile?.photoURL || profileResult.profilePicUrlHd,
             instagramFollowers: formatNumber(profileResult.followersCount),
             instagramAverageViews: formatNumber(Math.round(averageViews)),
             instagramAverageLikes: formatNumber(Math.round(averageLikes)),
             instagramAverageComments: formatNumber(Math.round(averageComments)),
             lastInstagramSync: serverTimestamp(),
          };
          batch.update(userProfileRef, dataToSave as any);

          const postsCollectionRef = collection(firestore, `users/${user.uid}/instagramPosts`);
          const oldPostsSnap = await getDocs(postsCollectionRef);
          oldPostsSnap.forEach(doc => batch.delete(doc.ref));
          
          fullPostsData.forEach(post => {
            const postRef = doc(postsCollectionRef, post.id);
            batch.set(postRef, post);
          });
          
          await batch.commit();
          
          await updateOrCreateMetricSnapshot('instagram', {
            followers: dataToSave.instagramFollowers,
            views: dataToSave.instagramAverageViews,
            likes: dataToSave.instagramAverageLikes,
            comments: dataToSave.instagramAverageComments,
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
    setTiktokRawResponse(null);
    form.setValue('tiktokProfile', undefined);
    form.setValue('tiktokPosts', undefined);

    const cleanedUsername = tiktokUsername.replace('@', '');

    try {
      const [profileResult, postsResult] = await Promise.all([
        getTikTokProfile(cleanedUsername),
        getTikTokPosts(cleanedUsername),
      ]);
      
        const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
        const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;
        const averageViews = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.views, 0) / postsResult.length : 0;
        
        const fullPostsData: TikTokPost[] = postsResult.map(p => ({
            ...p,
            fetchedAt: Timestamp.now(),
        }));


        form.setValue('tiktokProfile', profileResult);
        form.setValue('tiktokPosts', fullPostsData);
        form.setValue('tiktokHandle', `@${profileResult.username}`);
       
        if (user && userProfileRef && firestore) {
          const batch = writeBatch(firestore);
          const dataToSave = {
             tiktokHandle: `@${profileResult.username}`,
             photoURL: userProfile?.photoURL || profileResult.avatarUrl,
             bio: userProfile?.bio || profileResult.bio,
             tiktokFollowers: formatNumber(profileResult.followersCount),
             tiktokAverageLikes: formatNumber(Math.round(averageLikes)),
             tiktokAverageComments: formatNumber(Math.round(averageComments)),
             tiktokAverageViews: formatNumber(Math.round(averageViews)),
             lastTikTokSync: serverTimestamp(),
          };

          batch.update(userProfileRef, dataToSave as any);

           // Save posts
          const postsCollectionRef = collection(firestore, `users/${user.uid}/tiktokPosts`);
          const oldPostsSnap = await getDocs(postsCollectionRef);
          oldPostsSnap.forEach(doc => batch.delete(doc.ref));

          fullPostsData.forEach(post => {
            const postRef = doc(postsCollectionRef, post.id);
            batch.set(postRef, post);
          });

          await batch.commit();
          
          await updateOrCreateMetricSnapshot('tiktok', {
            followers: dataToSave.tiktokFollowers,
            views: dataToSave.tiktokAverageViews,
            likes: dataToSave.tiktokAverageLikes,
            comments: dataToSave.tiktokAverageComments,
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

  const handleTikTokClick = (post: TikTokPost) => {
    if (post.shareUrl) {
        setCurrentTikTokUrl(post.shareUrl);
        setShowTikTokModal(true);
    }
  };


  const isLoading = isProfileLoading;


  return (
    <div className="space-y-8">
       <Dialog open={showTikTokModal} onOpenChange={setShowTikTokModal}>
          <DialogContent className="sm:max-w-md p-0 border-0">
              {currentTikTokUrl && (
                  <iframe
                      key={currentTikTokUrl}
                      src={`https://www.tiktok.com/embed/v2/${currentTikTokUrl.split('/').pop()}`}
                      className="w-full aspect-[9/16]"
                      allow="autoplay; encrypted-media;"
                  ></iframe>
              )}
          </DialogContent>
      </Dialog>
      <PageHeader
        title="Integrações"
        description="Sincronize seus dados para obter métricas automáticas."
      >
         <Button variant="ghost" asChild>
          <Link href="/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Perfil
          </Link>
        </Button>
      </PageHeader>
          
          <Card className="rounded-2xl border-0">
            <CardContent className="pt-6 space-y-6">
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                <>
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Importante!</AlertTitle>
                    <AlertDescription>
                        Para a integração funcionar, sua conta do Instagram deve ser {'"Comercial"'} ou {'"Criador de Conteúdo"'}. A do TikTok deve ser pública.
                    </AlertDescription>
                  </Alert>

                  <Tabs defaultValue="instagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
                        <TabsTrigger value="instagram" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5"><Instagram className="mr-2 h-4 w-4" /> Instagram</TabsTrigger>
                        <TabsTrigger value="tiktok" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-primary px-6 py-2 text-sm font-semibold transition-colors hover:bg-primary/5"><Film className="mr-2 h-4 w-4" /> TikTok</TabsTrigger>
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
                                        disabled={instaStatus === 'loading' || !form.watch('instagramHandle')}
                                        className="w-full sm:w-auto"
                                    >
                                        {
                                         instaStatus === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> :
                                         <><RefreshCw className="mr-2 h-4 w-4" />Sincronizar</>
                                         }
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você confirma que tem permissão para buscar os dados do perfil <strong>@{form.watch('instagramHandle')?.replace('@', '')}</strong>?
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
                                Isso irá buscar seus dados públicos e métricas de posts recentes.
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
                                        disabled={tiktokStatus === 'loading' || !form.watch('tiktokHandle')}
                                        className="w-full sm:w-auto"
                                    >
                                        {
                                         tiktokStatus === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> :
                                         <><RefreshCw className="mr-2 h-4 w-4" />Sincronizar</>
                                         }
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você confirma que tem permissão para buscar os dados do perfil <strong>@{form.watch('tiktokHandle')?.replace('@', '')}</strong>?
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
                                Isso irá buscar seus dados públicos e métricas de vídeos recentes.
                            </p>
                            </CardContent>
                        </Card>
                         {tiktokStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                         {tiktokStatus === 'error' && tiktokError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{tiktokError}</AlertDescription></Alert>}
                         {tiktokStatus === 'success' && (
                          <>
                           <TikTokProfileResults profile={form.watch('tiktokProfile')!} posts={form.watch('tiktokPosts') ?? null} formatNumber={formatNumber} onVideoClick={handleTikTokClick} error={tiktokError} />
                          </>
                         )}
                    </TabsContent>
                  </Tabs>
                </>
                )}
            </CardContent>
          </Card>
    </div>
  );
}
