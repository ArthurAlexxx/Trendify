
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
import { User as UserIcon, Instagram, Film, Search, Loader2, AlertTriangle, Users, Heart, MessageSquare, Clapperboard, ShoppingBag, PlayCircle, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfileData, PostData } from './actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getInstagramPosts, getInstagramProfile } from './actions';


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
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';


export default function ProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const [username, setUsername] = useState('');
  
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
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
    try {
      const savedProfile = localStorage.getItem('lastInstagramProfile');
      const savedPosts = localStorage.getItem('lastInstagramPosts');

      if (savedProfile) {
        const parsedProfile: ProfileData = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        setUsername(parsedProfile.username); // Pre-fill search input
        setStatus('success');
      }
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      }
    } catch (e) {
      console.error("Failed to parse persisted Instagram data from localStorage", e);
      // Clear potentially corrupted data
      localStorage.removeItem('lastInstagramProfile');
      localStorage.removeItem('lastInstagramPosts');
    }
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString('pt-BR');
  };

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
      // Don't overwrite the search username if it was loaded from localStorage
      if (!username) {
        setUsername(userProfile.instagramHandle || '');
      }
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
            photoURL: user.photoURL || null,
        });
    }
  }, [userProfile, user, form, username]);

  const onProfileSubmit = (values: ProfileFormData) => {
    if (!user || !userProfileRef) return;
    
    startSavingTransition(async () => {
      try {
        await updateDoc(userProfileRef, values);
        
        if (user.displayName !== values.displayName && user.auth.currentUser) {
            await updateProfile(user.auth.currentUser, {
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

  const handleSearch = async () => {
    if (!username) {
      toast({ title: 'Atenção', description: 'Por favor, insira um nome de usuário.', variant: 'destructive'});
      return;
    }
    setStatus('loading');
    setError(null);
    setPostsError(null);
    setProfile(null);
    setPosts(null);

    const cleanedUsername = username.replace('@', '');

    try {
      const [profileResult, postsResult] = await Promise.allSettled([
        getInstagramProfile(cleanedUsername),
        getInstagramPosts(cleanedUsername)
      ]);

      if (profileResult.status === 'rejected') {
        throw new Error(profileResult.reason.message);
      }
      
      const fetchedProfile: ProfileData = profileResult.value;
      setProfile(fetchedProfile);
      setStatus('success');
      localStorage.setItem('lastInstagramProfile', JSON.stringify(fetchedProfile));

      
      let fetchedPosts: PostData[] = [];
      if (postsResult.status === 'fulfilled') {
        fetchedPosts = postsResult.value;
        setPosts(fetchedPosts);
        localStorage.setItem('lastInstagramPosts', JSON.stringify(fetchedPosts));
      } else {
        const postErrorMessage = 'Não foi possível carregar os posts recentes. ' + postsResult.reason.message;
        setPostsError(postErrorMessage);
        localStorage.removeItem('lastInstagramPosts');
      }
      
       if (userProfileRef) {
        const videoPosts = fetchedPosts.filter(p => p.isVideo && p.views);
        const averageViews = videoPosts.length > 0 
            ? videoPosts.reduce((acc, p) => acc + (p.views || 0), 0) / videoPosts.length 
            : 0;

        const averageLikes = fetchedPosts.length > 0
            ? fetchedPosts.reduce((acc, p) => acc + p.likes, 0) / fetchedPosts.length
            : 0;

        const averageComments = fetchedPosts.length > 0
            ? fetchedPosts.reduce((acc, p) => acc + p.comments, 0) / fetchedPosts.length
            : 0;
        
        const updateData: Partial<ProfileFormData> = {
            instagramHandle: `@${fetchedProfile.username}`,
            bio: fetchedProfile.biography,
            photoURL: fetchedProfile.profilePicUrlHd,
            instagramFollowers: formatNumber(fetchedProfile.followersCount),
            instagramAverageViews: formatNumber(Math.round(averageViews)),
            instagramAverageLikes: formatNumber(Math.round(averageLikes)),
            instagramAverageComments: formatNumber(Math.round(averageComments)),
        }

        form.reset({
            ...form.getValues(),
            ...updateData,
        });

        await updateDoc(userProfileRef, updateData);

        toast({
            title: "Perfil Atualizado!",
            description: "Os dados do Instagram foram salvos no seu perfil."
        })
       }


    } catch (e: any) {
      const errorMessage = e.message || 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
      setStatus('error');
      localStorage.removeItem('lastInstagramProfile');
      localStorage.removeItem('lastInstagramPosts');
    }
  };


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
                <span>Perfil & Métricas</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA para criar estratégias.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mb-8">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Integração com Instagram</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Importante!</AlertTitle>
                    <AlertDescription>
                        Para a integração automática funcionar, sua conta do Instagram deve ser pública e estar configurada como {"'Comercial'"} ou {"'Criador de Conteúdo'"}.
                    </AlertDescription>
                  </Alert>
                  <Card className='border-0 shadow-none'>
                    <CardContent className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-1 w-full">
                          <Label htmlFor="instagramHandleApi">Usuário do Instagram</Label>
                          <Input
                              id="instagramHandleApi"
                              placeholder="@seu_usuario"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="h-11 mt-1"
                          />
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" disabled={status === 'loading' || !username} className="w-full sm:w-auto">
                              <Search className="mr-2 h-4 w-4" />
                              Buscar Dados
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                              <AlertDialogDescription>
                                Você confirma que é o proprietário ou tem permissão para buscar os dados do perfil <strong>@{username.replace('@', '')}</strong>? Esta ação usará recursos da sua assinatura.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleSearch}>Sim, confirmar e buscar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className='text-xs text-muted-foreground mt-2'>Isso irá buscar e preencher sua foto, @, bio e métricas. Os dados serão salvos automaticamente no seu perfil.</p>
                    </CardContent>
                  </Card>
                </div>
                
                {status === 'loading' && (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                )}
                
                {status === 'error' && error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro ao Buscar Perfil</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {status === 'success' && profile && (
                  <div className="space-y-8 animate-in fade-in-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard icon={Users} label="Seguidores" value={formatNumber(profile.followersCount)} />
                      <MetricCard icon={Users} label="Seguindo" value={formatNumber(profile.followingCount)} />
                      <MetricCard icon={Clapperboard} label="Publicações" value={formatNumber(profile.mediaCount)} />
                      <MetricCard icon={ShoppingBag} label="Conta" value={profile.isBusiness ? "Comercial" : "Pessoal"} />
                    </div>

                    {postsError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Posts Recentes</AlertTitle>
                        <AlertDescription>{postsError}</AlertDescription>
                      </Alert>
                    )}
                    
                    {posts && posts.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-center mb-4">Posts Recentes (Últimos 31 dias)</h4>
                        <Carousel opts={{ align: "start", loop: false }} className="w-full max-w-sm mx-auto md:max-w-xl lg:max-w-4xl">
                          <CarouselContent>
                            {posts.map(post => (
                              <CarouselItem key={post.id} className="md:basis-1/2 lg:basis-1/3">
                                <Card className="overflow-hidden rounded-xl">
                                  <CardContent className="p-0 aspect-square relative group">
                                     {post.isVideo && post.videoUrl ? (
                                        <div className='relative w-full h-full'>
                                            <video
                                                src={post.videoUrl}
                                                controls
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        ) : (
                                        <Image 
                                            src={post.displayUrl} 
                                            alt={post.caption.slice(0, 50)} 
                                            width={400} height={400} 
                                            className="w-full h-full object-cover" 
                                        />
                                        )}
                                  </CardContent>
                                  <div className="p-3 bg-muted/30 text-xs text-muted-foreground grid grid-cols-3 gap-1 text-center">
                                    {post.isVideo && post.views !== undefined ? (
                                        <span className='flex items-center justify-center gap-1.5'><Eye className='h-4 w-4 text-blue-500' /> {formatNumber(post.views)}</span>
                                    ) : <span className='flex items-center justify-center gap-1.5'>-</span>}
                                    <span className='flex items-center justify-center gap-1.5'><Heart className='h-4 w-4 text-pink-500' /> {formatNumber(post.likes)}</span>
                                    <span className='flex items-center justify-center gap-1.5'><MessageSquare className='h-4 w-4 text-sky-500' /> {formatNumber(post.comments)}</span>
                                  </div>
                                </Card>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="ml-12 hidden sm:flex" />
                          <CarouselNext className="mr-12 hidden sm:flex" />
                        </Carousel>
                      </div>
                    )}
                  </div>
                )}
                
                <Separator className="my-8" />
                
                <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8 text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={form.watch('photoURL') ?? undefined} alt="User Avatar" />
                        <AvatarFallback>
                          {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="displayName">Nome de Exibição</Label>
                        <Input
                          id="displayName"
                          {...form.register('displayName')}
                          className="h-11"
                        />
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
                    <div className="grid sm:grid-cols-2 gap-6">
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
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageViews">Média de Views (Reels)</Label>
                        <Input id="instagramAverageViews" {...form.register('instagramAverageViews')} placeholder="Ex: 15.5K (manual)" className="h-11" />
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
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Film className="h-5 w-5" /> TikTok</h3>
                     <div className="grid sm:grid-cols-2 gap-6">
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
                    <div className="grid sm:grid-cols-3 gap-6">
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
            </CardContent>
          </Card>
    </div>
  );
}


function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) {
  return (
    <Card className='text-center p-4 bg-muted/50 border-border/50'>
        <div className="flex justify-center items-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto mb-3">
          <Icon className="h-6 w-6" />
        </div>
      <p className="text-2xl font-bold font-headline">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  )
}
