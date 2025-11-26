
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
import { useUser, useFirestore, useDoc, useMemoFirebase, initializeFirebase, useAuth } from '@/firebase';
import { User as UserIcon, Instagram, Film, Search, Loader2, AlertTriangle, Users, Heart, MessageSquare, Clapperboard, PlayCircle, Eye, Upload, Crown, Check, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { updateProfile } from 'firebase/auth';
import type { UserProfile, InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPostData } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getInstagramProfile, getTikTokPosts, getTikTokProfile, getInstagramPosts } from './actions';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { isToday } from 'date-fns';


const profileFormSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  photoURL: z.string().url().optional().nullable(),
  niche: z.string().optional(),
  bio: z.string().optional(),
  audience: z.string().optional(),
  instagramHandle: z.string().optional(),
  instagramFollowers: z.string().optional(),
  instagramAverageViews: z.string().optional(),
  instagramAverageLikes: z.string().optional(),
  instagramAverageComments: z.string().optional(),
  tiktokHandle: z.string().optional(),
  tiktokFollowers: z.string().optional(),
  tiktokAverageViews: z.string().optional(),
  tiktokAverageLikes: z.string().optional(),
  tiktokAverageComments: z.string().optional(),
  // --- Campos para dados da API que não são salvos diretamente no Firestore, mas usados na UI ---
  instagramProfile: z.custom<InstagramProfileData>().optional(),
  instagramPosts: z.custom<InstagramPostData[]>().optional(),
  tiktokProfile: z.custom<TikTokProfileData>().optional(),
  tiktokPosts: z.custom<TikTokPostData[]>().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';


export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();

  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';
  
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
      displayName: '',
      photoURL: null,
      niche: '',
      bio: '',
      audience: '',
      instagramHandle: '',
      instagramFollowers: '',
      instagramAverageViews: '',
      instagramAverageLikes: '',
      instagramAverageComments: '',
      tiktokHandle: '',
      tiktokFollowers: '',
      tiktokAverageViews: '',
      tiktokAverageLikes: '',
      tiktokAverageComments: '',
    },
  });
  
  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || null,
        niche: userProfile.niche || '',
        bio: userProfile.bio || '',
        audience: userProfile.audience || '',
        instagramHandle: userProfile.instagramHandle || '',
        instagramFollowers: userProfile.instagramFollowers || '',
        instagramAverageViews: userProfile.instagramAverageViews || '',
        instagramAverageLikes: userProfile.instagramAverageLikes || '',
        instagramAverageComments: userProfile.instagramAverageComments || '',
        tiktokHandle: userProfile.tiktokHandle || '',
        tiktokFollowers: userProfile.tiktokFollowers || '',
        tiktokAverageViews: userProfile.tiktokAverageViews || '',
        tiktokAverageLikes: userProfile.tiktokAverageLikes || '',
        tiktokAverageComments: userProfile.tiktokAverageComments || '',
      });
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
            photoURL: user.photoURL || null,
        });
    }
  }, [userProfile, user, form]);

  const onProfileSubmit = (values: ProfileFormData) => {
    if (!user || !userProfileRef) return;
    
    startSavingTransition(async () => {
      try {
        const dataToSave: Partial<UserProfile> = {
            displayName: values.displayName,
            photoURL: values.photoURL || null,
            niche: values.niche,
            bio: values.bio,
            audience: values.audience,
            instagramHandle: values.instagramHandle,
            instagramFollowers: values.instagramFollowers,
            instagramAverageViews: values.instagramAverageViews,
            instagramAverageLikes: values.instagramAverageLikes,
            instagramAverageComments: values.instagramAverageComments,
            tiktokHandle: values.tiktokHandle,
            tiktokFollowers: values.tiktokFollowers,
            tiktokAverageViews: values.tiktokAverageViews,
            tiktokAverageLikes: values.tiktokAverageLikes,
            tiktokAverageComments: values.tiktokAverageComments,
        };

        await updateDoc(userProfileRef, dataToSave);
        
        if (user && auth.currentUser && user.displayName !== values.displayName) {
            await updateProfile(auth.currentUser, {
                displayName: values.displayName,
            });
        }
        
        toast({
          title: 'Sucesso!',
          description: 'Seu perfil foi atualizado.',
        });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        toast({
          title: 'Erro ao Atualizar',
          description: 'Não foi possível atualizar seu perfil. ' + error.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !auth.currentUser) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: 'Arquivo inválido', description: 'Por favor, selecione um arquivo de imagem.', variant: 'destructive'});
        return;
    }

    const { firebaseApp } = initializeFirebase();
    const storage = getStorage(firebaseApp);
    const storagePath = `profile-pictures/${user.uid}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);

    uploadTask.on(
        'state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error('Upload error:', error);
            toast({ title: 'Erro no Upload', description: 'Não foi possível enviar sua foto.', variant: 'destructive'});
            setUploadProgress(null);
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await updateProfile(auth.currentUser!, { photoURL: downloadURL });
                if (userProfileRef) {
                    await updateDoc(userProfileRef, { photoURL: downloadURL });
                }
                form.setValue('photoURL', downloadURL);
                toast({ title: 'Sucesso!', description: 'Sua foto de perfil foi atualizada.' });
            } catch (e: any) {
                toast({ title: 'Erro ao Atualizar', description: `Não foi possível salvar a nova foto. ${e.message}`, variant: 'destructive' });
            } finally {
                setUploadProgress(null);
            }
        }
    );
};

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
      
       const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
       const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;

        form.setValue('instagramProfile', profileResult);
        form.setValue('instagramPosts', postsResult);
        form.setValue('instagramHandle', `@${profileResult.username}`);
        form.setValue('bio', form.getValues('bio') || profileResult.biography);
        form.setValue('photoURL', form.getValues('photoURL') || profileResult.profilePicUrlHd);
        form.setValue('instagramFollowers', formatNumber(profileResult.followersCount));
        form.setValue('instagramAverageLikes', formatNumber(Math.round(averageLikes)));
        form.setValue('instagramAverageComments', formatNumber(Math.round(averageComments)));
        
        // This will trigger a save with the new data
        if (user && userProfileRef) {
          await updateDoc(userProfileRef, {
             ...form.getValues(),
             lastInstagramSync: serverTimestamp(),
          });
        }
        
        setInstaStatus('success');

    } catch (e: any) {
      setInstaError(e.message || 'Ocorreu um erro desconhecido.');
      setInstaStatus('error');
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
        form.setValue('photoURL', form.getValues('photoURL') || profileResult.avatarUrl);
        form.setValue('tiktokFollowers', formatNumber(profileResult.followersCount));
        form.setValue('tiktokAverageLikes', formatNumber(Math.round(averageLikes)));
        form.setValue('tiktokAverageComments', formatNumber(Math.round(averageComments)));
        form.setValue('tiktokAverageViews', formatNumber(Math.round(averageViews)));
       
        if (user && userProfileRef) {
          await updateDoc(userProfileRef, {
             ...form.getValues(),
             lastTikTokSync: serverTimestamp(),
          });
        }
        setTiktokStatus('success');

    } catch (e: any) {
      setTiktokError(e.message || 'Ocorreu um erro desconhecido.');
      setTiktokStatus('error');
    }
  };

  const hasSyncedToday = (lastSync: any) => {
    if (!lastSync) return false;
    return isToday(lastSync.toDate());
  };

  const isInstaSyncedToday = hasSyncedToday(userProfile?.lastInstagramSync);
  const isTiktokSyncedToday = hasSyncedToday(userProfile?.lastTikTokSync);

  const isLoading = isProfileLoading || isSubscriptionLoading;


  return (
    <div className="space-y-8">
      <PageHeader
        icon={<UserIcon className="text-primary" />}
        title="Gerencie seu Perfil"
        description="Mantenha suas informações atualizadas para a IA gerar estratégias mais precisas."
      />
          <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
            <CardHeader className="text-center sm:text-left">
              <CardTitle className="flex items-center justify-center sm:justify-start gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil & Métricas Manuais</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA para criar estratégias.
              </CardDescription>
            </CardHeader>
            <CardContent>
             {isLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                </div>
             ) : (
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8 text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <AvatarImage src={form.watch('photoURL') ?? undefined} alt="User Avatar" />
                        <AvatarFallback>
                          {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="displayName">Nome de Exibição</Label>
                        <Input
                          id="displayName"
                          {...form.register('displayName')}
                          className="h-11"
                        />
                         {uploadProgress !== null && (
                          <div className="space-y-1">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">{uploadProgress < 100 ? `Enviando... ${uploadProgress.toFixed(0)}%` : 'Finalizando...'}</p>
                          </div>
                        )}
                        {form.formState.errors.displayName && <p className="text-sm font-medium text-destructive">{form.formState.errors.displayName.message}</p>}
                    </div>
                  </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="niche">Seu Nicho</Label>
                    <Input
                      id="niche"
                      placeholder="Ex: Lifestyle, moda e beleza sustentável"
                      {...form.register('niche')}
                      className="h-11"
                    />
                  </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="bio">Bio para Mídia Kit</Label>
                    <Textarea
                      id="bio"
                      placeholder="Uma bio curta e profissional sobre você..."
                      {...form.register('bio')}
                      className="min-h-[120px] rounded-xl"
                    />
                  </div>
                  
                <div className="space-y-2">
                    <Label htmlFor="audience">Demografia do Público</Label>
                    <Input
                        id="audience"
                        placeholder="Ex: 75% Mulheres, 18-24 anos, localizadas no Brasil"
                        {...form.register('audience')}
                        className="h-11"
                    />
                </div>
                
                <Separator />

                {/* Instagram */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Métricas do Instagram</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramHandle">Handle do Instagram</Label>
                        <Input
                            id="instagramHandle"
                            placeholder="@seu_usuario"
                            {...form.register('instagramHandle')}
                            className="h-11"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramFollowers">Seguidores no Instagram</Label>
                        <Input id="instagramFollowers" {...form.register('instagramFollowers')} placeholder="Ex: 250K" className="h-11" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageViews">Média de Views (Manual)</Label>
                        <Input id="instagramAverageViews" {...form.register('instagramAverageViews')} placeholder="Ex: 15.5K" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageLikes">Média de Likes</Label>
                        <Input id="instagramAverageLikes" {...form.register('instagramAverageLikes')} placeholder="Ex: 890" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageComments">Média de Comentários</Label>
                        <Input id="instagramAverageComments" {...form.register('instagramAverageComments')} placeholder="Ex: 120" className="h-11" />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* TikTok */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Film className="h-5 w-5" /> Métricas do TikTok</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="tiktokHandle">Handle do TikTok</Label>
                        <Input
                            id="tiktokHandle"
                            placeholder="@seu_usuario"
                            {...form.register('tiktokHandle')}
                            className="h-11"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokFollowers">Seguidores no TikTok</Label>
                        <Input id="tiktokFollowers" {...form.register('tiktokFollowers')} placeholder="Ex: 1.2M" className="h-11" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageViews">Média de Views</Label>
                        <Input id="tiktokAverageViews" {...form.register('tiktokAverageViews')} placeholder="Ex: 1M" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageLikes">Média de Likes</Label>
                        <Input id="tiktokAverageLikes" {...form.register('tiktokAverageLikes')} placeholder="Ex: 100K" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageComments">Média de Comentários</Label>
                        <Input id="tiktokAverageComments" {...form.register('tiktokAverageComments')} placeholder="Ex: 1.5K" className="h-11" />
                        </div>
                    </div>
                </div>


                <div className="flex justify-center sm:justify-end pt-2">
                  <Button type="submit" disabled={isSaving || isProfileLoading} className="font-manrope rounded-full w-full sm:w-auto">
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
             )}
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                  <Instagram className="h-6 w-6 text-primary" />
                  <span>Integração de Plataformas</span>
                </CardTitle>
                <CardDescription>
                  Busque dados públicos de um perfil para preencher ou atualizar suas métricas e foto (disponível uma vez por dia).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                        disabled={instaStatus === 'loading' || !form.watch('instagramHandle') || isInstaSyncedToday}
                                        className="w-full sm:w-auto"
                                    >
                                        {isInstaSyncedToday ? <><Check className="mr-2 h-4 w-4" />Sincronizado Hoje</> :
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
                            <p className='text-xs text-muted-foreground mt-2'>Isso irá buscar e preencher sua foto, @, bio e métricas de seguidores, curtidas e comentários.</p>
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
                                        disabled={tiktokStatus === 'loading' || !form.watch('tiktokHandle') || isTiktokSyncedToday}
                                        className="w-full sm:w-auto"
                                    >
                                        {isTiktokSyncedToday ? <><Check className="mr-2 h-4 w-4" />Sincronizado Hoje</> :
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
                            <p className='text-xs text-muted-foreground mt-2'>Isso irá buscar e preencher sua foto, @, bio e métricas do TikTok.</p>
                            </CardContent>
                        </Card>
                         {tiktokStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                         {tiktokStatus === 'error' && tiktokError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{tiktokError}</AlertDescription></Alert>}
                         {tiktokStatus === 'success' && <TikTokProfileResults profile={form.watch('tiktokProfile')!} posts={form.watch('tiktokPosts') ?? null} formatNumber={formatNumber} error={tiktokError} />}
                    </TabsContent>
                  </Tabs>
                </>
                ) : (
                    <Card className="border-yellow-400/50 bg-yellow-400/5 shadow-lg shadow-yellow-500/5 rounded-2xl text-center">
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


    