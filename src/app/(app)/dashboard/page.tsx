
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  Eye,
  Heart,
  MessageSquare,
  AlertTriangle,
  LayoutGrid,
  ClipboardList,
  Calendar,
  MoreHorizontal,
  CheckCircle,
  Tag,
  Rocket,
  RefreshCw,
  Loader2,
  Instagram,
  Film,
  Clapperboard,
  Search,
  Crown,
  PlayCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import type {
  ItemRoteiro,
  IdeiaSalva,
  ConteudoAgendado,
  UserProfile,
  PlanoSemanal,
  MetricSnapshot,
  InstagramProfileData, 
  InstagramPostData, 
  TikTokProfileData, 
  TikTokPostData
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useMemo, useEffect, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, updateDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getInstagramProfile, getTikTokPosts, getTikTokProfile, getInstagramPosts } from '../profile/actions';
import { useSubscription } from '@/hooks/useSubscription';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const chartConfigBase = {
  followers: { label: "Seguidores" },
  views: { label: "Views (Manual)" },
  likes: { label: "Likes" },
  comments: { label: "Comentários" },
} satisfies ChartConfig;

const platformChartConfig = {
  total: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
  instagram: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
  tiktok: {
    ...chartConfigBase,
    followers: { ...chartConfigBase.followers, color: "hsl(var(--primary))" },
    views: { ...chartConfigBase.views, color: "hsl(var(--chart-2))" },
    likes: { ...chartConfigBase.likes, color: "hsl(var(--chart-3))" },
    comments: { ...chartConfigBase.comments, color: "hsl(var(--chart-4))" },
  },
} satisfies Record<string, ChartConfig>;


const profileMetricsSchema = z.object({
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


const ProfileCompletionAlert = ({ userProfile, hasUpdatedToday, isPremium }: { userProfile: UserProfile | null, hasUpdatedToday: boolean, isPremium: boolean }) => {
    const isProfileSetup = userProfile?.niche && (userProfile.instagramHandle || userProfile.tiktokHandle);
    const hasAnyPlatform = userProfile?.instagramHandle || userProfile?.tiktokHandle;

    if (!userProfile?.niche) {
      return (
          <Alert>
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertTitle>Complete seu Perfil!</AlertTitle>
              <AlertDescription>
                  <Link href="/profile" className='hover:underline font-semibold'>Adicione seu nicho de atuação</Link> para que a IA gere insights mais precisos.
              </AlertDescription>
          </Alert>
      )
    }

    if (!hasAnyPlatform) {
         return (
             <Alert>
                <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
                    <div className='text-center sm:text-left'>
                        <AlertTitle className="flex items-center justify-center sm:justify-start gap-2">
                           {isPremium ? <AlertTriangle className="h-4 w-4 text-primary" /> : <Crown className="h-4 w-4 text-yellow-500" />}
                           {isPremium ? 'Conecte suas Plataformas!' : 'Recurso Premium Disponível'}
                        </AlertTitle>
                        <AlertDescription>
                           {isPremium 
                               ? 'Integre seu Instagram ou TikTok para começar a acompanhar suas métricas.'
                               : 'Faça upgrade para o Premium e conecte suas redes para atualizar métricas automaticamente.'
                           }
                        </AlertDescription>
                    </div>
                   {userProfile && isPremium && <PlatformIntegrationModal userProfile={userProfile} />}
                   {!isPremium && (
                       <Button asChild className='w-full sm:w-auto'>
                           <Link href="/subscribe">Ver Planos</Link>
                       </Button>
                   )}
                </div>
            </Alert>
         )
    }

    if (!hasUpdatedToday && userProfile) {
         return (
            <Alert>
                <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
                    <div className='text-center sm:text-left'>
                        <AlertTitle className="flex items-center justify-center sm:justify-start gap-2"><AlertTriangle className="h-4 w-4 text-primary" />Atualize suas Métricas!</AlertTitle>
                        <AlertDescription>
                            Registre seus números de hoje para manter os gráficos precisos.
                        </AlertDescription>
                    </div>
                    <UpdateMetricsModal userProfile={userProfile} triggerButton={
                         <Button className='w-full sm:w-auto'>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Atualizar Métricas Agora
                        </Button>
                    } />
                </div>
            </Alert>
        )
    }

    return null;
}


const UpdateMetricsModal = ({ userProfile, triggerButton }: { userProfile: UserProfile, triggerButton?: React.ReactNode }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof profileMetricsSchema>>({
        resolver: zodResolver(profileMetricsSchema),
        defaultValues: {
            instagramHandle: userProfile?.instagramHandle || '',
            instagramFollowers: userProfile?.instagramFollowers || '',
            instagramAverageViews: userProfile?.instagramAverageViews || '',
            instagramAverageLikes: userProfile?.instagramAverageLikes || '',
            instagramAverageComments: userProfile?.instagramAverageComments || '',
            tiktokHandle: userProfile?.tiktokHandle || '',
            tiktokFollowers: userProfile?.tiktokFollowers || '',
            tiktokAverageViews: userProfile?.tiktokAverageViews || '',
            tiktokAverageLikes: userProfile?.tiktokAverageLikes || '',
            tiktokAverageComments: userProfile?.tiktokAverageComments || '',
        }
    });

    useEffect(() => {
        if (userProfile && isOpen) {
            form.reset({
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
        }
    }, [userProfile, isOpen, form]);

    const onSubmit = (values: z.infer<typeof profileMetricsSchema>) => {
        if (!user || !firestore) return;
        const userProfileRef = doc(firestore, 'users', user.uid);

        startTransition(async () => {
            try {
                await updateDoc(userProfileRef, values);

                const metricSnapshotsRef = collection(firestore, `users/${user.uid}/metricSnapshots`);

                if (values.instagramHandle && values.instagramFollowers) {
                    await addDoc(metricSnapshotsRef, {
                        userId: user.uid,
                        date: serverTimestamp(),
                        platform: 'instagram',
                        followers: values.instagramFollowers || '0',
                        views: values.instagramAverageViews || '0',
                        likes: values.instagramAverageLikes || '0',
                        comments: values.instagramAverageComments || '0',
                    });
                }
                if (values.tiktokHandle && values.tiktokFollowers) {
                    await addDoc(metricSnapshotsRef, {
                        userId: user.uid,
                        date: serverTimestamp(),
                        platform: 'tiktok',
                        followers: values.tiktokFollowers || '0',
                        views: values.tiktokAverageViews || '0',
                        likes: values.tiktokAverageLikes || '0',
                        comments: values.tiktokAverageComments || '0',
                    });
                }

                toast({
                    title: 'Sucesso!',
                    description: 'Suas métricas foram salvas.',
                });
                setIsOpen(false);
            } catch (error: any) {
                toast({
                    title: 'Erro ao Atualizar',
                    description: 'Não foi possível salvar suas métricas. ' + error.message,
                    variant: 'destructive',
                });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {triggerButton || 
                <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar Métricas
                </Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Atualizar Métricas Diárias</DialogTitle>
                    <DialogDescription>
                        Insira seus números mais recentes para manter o gráfico de evolução preciso.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 text-left">
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Instagram</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="instagramHandle" render={({ field }) => ( <FormItem><FormLabel>Handle</FormLabel><FormControl><Input placeholder="@seu_usuario" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="instagramFollowers" render={({ field }) => ( <FormItem><FormLabel>Seguidores</FormLabel><FormControl><Input placeholder="Ex: 250K" {...field} /></FormControl></FormItem> )}/>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <FormField control={form.control} name="instagramAverageViews" render={({ field }) => ( <FormItem><FormLabel>Views (Média)</FormLabel><FormControl><Input placeholder="Ex: 15.5K (manual)" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="instagramAverageLikes" render={({ field }) => ( <FormItem><FormLabel>Likes (Média)</FormLabel><FormControl><Input placeholder="Ex: 890" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="instagramAverageComments" render={({ field }) => ( <FormItem><FormLabel>Comentários (Média)</FormLabel><FormControl><Input placeholder="Ex: 120" {...field} /></FormControl></FormItem> )}/>
                        </div>
                    </div>
                    <Separator />
                     <div className="space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Film className="h-5 w-5" /> TikTok</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="tiktokHandle" render={({ field }) => ( <FormItem><FormLabel>Handle</FormLabel><FormControl><Input placeholder="@seu_usuario" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="tiktokFollowers" render={({ field }) => ( <FormItem><FormLabel>Seguidores</FormLabel><FormControl><Input placeholder="Ex: 1.2M" {...field} /></FormControl></FormItem> )}/>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <FormField control={form.control} name="tiktokAverageViews" render={({ field }) => ( <FormItem><FormLabel>Views (Média)</FormLabel><FormControl><Input placeholder="Ex: 1M" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="tiktokAverageLikes" render={({ field }) => ( <FormItem><FormLabel>Likes (Média)</FormLabel><FormControl><Input placeholder="Ex: 100K" {...field} /></FormControl></FormItem> )}/>
                            <FormField control={form.control} name="tiktokAverageComments" render={({ field }) => ( <FormItem><FormLabel>Comentários (Média)</FormLabel><FormControl><Input placeholder="Ex: 1.5K" {...field} /></FormControl></FormItem> )}/>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Métricas
                        </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

const PlatformIntegrationModal = ({ userProfile }: { userProfile: UserProfile }) => {
    type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const [username, setUsername] = useState(userProfile.instagramHandle || '');
    const [tiktokUsername, setTiktokUsername] = useState(userProfile.tiktokHandle || '');

    const [instaStatus, setInstaStatus] = useState<SearchStatus>('idle');
    const [instaProfile, setInstaProfile] = useState<InstagramProfileData | null>(null);
    const [instaPosts, setInstaPosts] = useState<InstagramPostData[] | null>(null);
    const [instaError, setInstaError] = useState<string | null>(null);

    const [tiktokStatus, setTiktokStatus] = useState<SearchStatus>('idle');
    const [tiktokProfile, setTiktokProfile] = useState<TikTokProfileData | null>(null);
    const [tiktokPosts, setTiktokPosts] = useState<TikTokPostData[] | null>(null);
    const [tiktokError, setTiktokError] = useState<string | null>(null);

    const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
        if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
        if (num >= 1000) return num.toLocaleString('pt-BR');
        return String(num);
    };

    const handleInstagramSearch = async () => {
        if (!username) {
            toast({ title: 'Atenção', description: 'Por favor, insira um nome de usuário do Instagram.', variant: 'destructive' });
            return;
        }
        setInstaStatus('loading');
        setInstaError(null);
        setInstaProfile(null);
        setInstaPosts(null);

        const cleanedUsername = username.replace('@', '');

        try {
            const [profileResult, postsResult] = await Promise.all([
                getInstagramProfile(cleanedUsername),
                getInstagramPosts(cleanedUsername)
            ]);

            setInstaProfile(profileResult);
            setInstaPosts(postsResult);
            setInstaStatus('success');

            if (user && firestore) {
                const userProfileRef = doc(firestore, 'users', user.uid);
                const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
                const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;

                const updateData: Partial<UserProfile> = {
                    instagramHandle: `@${profileResult.username}`,
                    bio: userProfile.bio || profileResult.biography,
                    photoURL: userProfile.photoURL || profileResult.profilePicUrlHd,
                    instagramFollowers: formatNumber(profileResult.followersCount),
                    instagramAverageLikes: formatNumber(Math.round(averageLikes)),
                    instagramAverageComments: formatNumber(Math.round(averageComments)),
                }
                await updateDoc(userProfileRef, updateData);
                toast({ title: "Perfil Atualizado!", description: "Os dados do Instagram foram salvos no seu perfil." });
            }
        } catch (e: any) {
            setInstaError(e.message || 'Ocorreu um erro desconhecido.');
            setInstaStatus('error');
        }
    };
    
    const handleTiktokSearch = async () => {
    if (!tiktokUsername) {
      toast({ title: 'Atenção', description: 'Por favor, insira um nome de usuário do TikTok.', variant: 'destructive'});
      return;
    }
    setTiktokStatus('loading');
    setTiktokError(null);
    setTiktokProfile(null);
    setTiktokPosts(null);

    const cleanedUsername = tiktokUsername.replace('@', '');

    try {
      const profileResult = await getTikTokProfile(cleanedUsername);
      setTiktokProfile(profileResult);

      let fetchedPosts: TikTokPostData[] = [];
      try {
          fetchedPosts = await getTikTokPosts(cleanedUsername);
          setTiktokPosts(fetchedPosts);
      } catch(postsError: any) {
          setTiktokError('Perfil encontrado, mas não foi possível carregar os vídeos recentes. ' + postsError.message);
      }

      setTiktokStatus('success');

      if (user && firestore) {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const averageLikes = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.likes, 0) / fetchedPosts.length : 0;
        const averageComments = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.comments, 0) / fetchedPosts.length : 0;
        const averageViews = fetchedPosts.length > 0 ? fetchedPosts.reduce((acc, p) => acc + p.views, 0) / fetchedPosts.length : 0;

        const updateData: Partial<UserProfile> = {
            tiktokHandle: `@${profileResult.username}`,
            bio: userProfile.bio || profileResult.bio,
            photoURL: userProfile.photoURL || profileResult.avatarUrl,
            tiktokFollowers: formatNumber(profileResult.followersCount),
            tiktokAverageLikes: formatNumber(Math.round(averageLikes)),
            tiktokAverageComments: formatNumber(Math.round(averageComments)),
            tiktokAverageViews: formatNumber(Math.round(averageViews)),
        };
        await updateDoc(userProfileRef, updateData);
        toast({ title: "Perfil Atualizado!", description: "Os dados do TikTok foram salvos no seu perfil." });
      }
    } catch (e: any) {
      setTiktokError(e.message || 'Ocorreu um erro desconhecido.');
      setTiktokStatus('error');
    }
  };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className='w-full sm:w-auto'>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Conectar Plataformas
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Conectar Plataformas</DialogTitle>
                    <DialogDescription>
                        Busque dados públicos de um perfil para preencher automaticamente suas métricas.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className='border-0 shadow-none'>
                          <CardContent className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex flex-col items-start gap-4">
                              <div className="w-full">
                                <Label htmlFor="instagramHandleApi" className="mb-1 flex items-center gap-2 font-semibold"><Instagram className='h-4 w-4'/> Instagram</Label>
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
                                  <Button type="button" disabled={instaStatus === 'loading' || !username} className="w-full">
                                  <Search className="mr-2 h-4 w-4" />
                                  Buscar Dados
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Você confirma que é o proprietário ou tem permissão para buscar os dados do perfil <strong>@{username.replace('@', '')}</strong>?
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleInstagramSearch}>Sim, confirmar e buscar</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                              </AlertDialog>
                          </div>
                          </CardContent>
                      </Card>
                      <Card className='border-0 shadow-none'>
                            <CardContent className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex flex-col items-start gap-4">
                                <div className="w-full">
                                  <Label htmlFor="tiktokHandleApi" className="mb-1 flex items-center gap-2 font-semibold"><Film className='h-4 w-4'/> TikTok</Label>
                                  <Input
                                      id="tiktokHandleApi"
                                      placeholder="@seu_usuario"
                                      value={tiktokUsername}
                                      onChange={(e) => setTiktokUsername(e.target.value)}
                                      className="h-11 mt-1"
                                  />
                                </div>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" disabled={tiktokStatus === 'loading' || !tiktokUsername} className="w-full">
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar Dados
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmação de Busca</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você confirma que é o proprietário ou tem permissão para buscar os dados do perfil <strong>@{tiktokUsername.replace('@', '')}</strong>?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleTiktokSearch}>Sim, confirmar e buscar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            </CardContent>
                        </Card>
                  </div>
                </div>
                 {instaStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                 {instaStatus === 'error' && instaError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{instaError}</AlertDescription></Alert>}
                 {instaStatus === 'success' && instaProfile && <InstagramProfileResults profile={instaProfile} posts={instaPosts} error={instaError} formatNumber={formatNumber}/>}
                
                 {tiktokStatus === 'loading' && <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
                 {tiktokStatus === 'error' && tiktokError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao Buscar Perfil</AlertTitle><AlertDescription>{tiktokError}</AlertDescription></Alert>}
                 {tiktokStatus === 'success' && tiktokProfile && <TikTokProfileResults profile={tiktokProfile} posts={tiktokPosts} error={tiktokError} formatNumber={formatNumber}/>}
            </DialogContent>
        </Dialog>
    )
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'total' | 'instagram' | 'tiktok'>('total');

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isPremium = subscription?.plan === 'premium' && subscription.status === 'active';

  const userProfileRef = useMemoFirebase(() => (
      firestore && user ? doc(firestore, `users/${user.uid}`) : null
  ), [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  
  const [instaPosts, setInstaPosts] = useState<InstagramPostData[] | null>(null);
  const [tiktokPosts, setTiktokPosts] = useState<TikTokPostData[] | null>(null);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);


  useEffect(() => {
    const fetchPosts = async () => {
        if (!userProfile) return;

        setIsFetchingPosts(true);
        if (userProfile.instagramHandle) {
            try {
                const posts = await getInstagramPosts(userProfile.instagramHandle.replace('@', ''));
                setInstaPosts(posts);
            } catch (e) {
                console.error("Failed to fetch instagram posts on dashboard", e);
            }
        }
        if (userProfile.tiktokHandle) {
            try {
                const posts = await getTikTokPosts(userProfile.tiktokHandle.replace('@', ''));
                setTiktokPosts(posts);
            } catch (e) {
                console.error("Failed to fetch tiktok posts on dashboard", e);
            }
        }
        setIsFetchingPosts(false);
    };

    fetchPosts();
  }, [userProfile]);


  const roteiroQuery = useMemoFirebase(() => (
      firestore ? query(collection(firestore, 'roteiro'), orderBy('createdAt', 'desc'), limit(1)) : null
  ), [firestore]);
  const { data: roteiroData, isLoading: isLoadingRoteiro } = useCollection<PlanoSemanal>(roteiroQuery);
  const roteiro = roteiroData?.[0];

  const ideiasQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/ideiasSalvas`), where('concluido', '==', false), limit(5)) : null
  ), [firestore, user]);
  const { data: ideiasSalvas, isLoading: isLoadingIdeias } = useCollection<IdeiaSalva>(ideiasQuery);
  
  const upcomingContentQuery = useMemoFirebase(() => (
      firestore && user ? query(collection(firestore, `users/${user.uid}/conteudoAgendado`), where('status', '==', 'Agendado'), orderBy('date', 'asc'), limit(3)) : null
  ), [firestore, user]);
  const { data: upcomingContent, isLoading: isLoadingUpcoming } = useCollection<ConteudoAgendado>(upcomingContentQuery);

  const metricSnapshotsQuery = useMemoFirebase(() => (
    firestore && user ? query(collection(firestore, `users/${user.uid}/metricSnapshots`), orderBy('date', 'desc'), limit(60)) : null // Fetch more to combine
  ), [firestore, user]);
  const { data: metricSnapshots, isLoading: isLoadingMetrics } = useCollection<MetricSnapshot>(metricSnapshotsQuery);

  const hasUpdatedToday = useMemo(() => {
    if (!metricSnapshots || metricSnapshots.length === 0) return false;
    // Check if there is any snapshot for today
    return metricSnapshots.some(snap => snap.date && isToday(snap.date.toDate()));
  }, [metricSnapshots]);


  const isLoading = isLoadingProfile || isLoadingRoteiro || isLoadingIdeias || isLoadingUpcoming || isLoadingMetrics || isSubscriptionLoading;
  
  const parseMetric = (value?: string | number) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const num = parseFloat(value.replace(/K/gi, 'e3').replace(/M/gi, 'e6').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };
  
  const latestMetrics = useMemo(() => {
    if (!userProfile) return null;
    if (selectedPlatform === 'total') {
        const hasInsta = !!userProfile.instagramHandle;
        const hasTiktok = !!userProfile.tiktokHandle;

        return {
            handle: hasInsta && hasTiktok ? 'Total' : hasInsta ? userProfile.instagramHandle : hasTiktok ? userProfile.tiktokHandle : 'N/A',
            followers: parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers),
            views: parseMetric(userProfile.instagramAverageViews) + parseMetric(userProfile.tiktokAverageViews),
            likes: parseMetric(userProfile.instagramAverageLikes) + parseMetric(userProfile.tiktokAverageLikes),
            comments: parseMetric(userProfile.instagramAverageComments) + parseMetric(userProfile.tiktokAverageComments),
        }
    }
    return selectedPlatform === 'instagram' ? {
        handle: userProfile.instagramHandle,
        followers: parseMetric(userProfile.instagramFollowers),
        views: parseMetric(userProfile.instagramAverageViews),
        likes: parseMetric(userProfile.instagramAverageLikes),
        comments: parseMetric(userProfile.instagramAverageComments),
    } : {
        handle: userProfile.tiktokHandle,
        followers: parseMetric(userProfile.tiktokFollowers),
        views: parseMetric(userProfile.tiktokAverageViews),
        likes: parseMetric(userProfile.tiktokAverageLikes),
        comments: parseMetric(userProfile.tiktokAverageComments),
    }
  }, [userProfile, selectedPlatform]);

  const formatMetricValue = (value?: string | number): string => {
    if (value === undefined || value === null) return '—';
    const num = typeof value === 'string' ? parseMetric(value) : value;
     if (num === 0) return 'N/A';

    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
    return num.toLocaleString('pt-BR');
  };


  const historicalChartData = useMemo(() => {
    if (!metricSnapshots) return [];

    if (selectedPlatform === 'total') {
      const combinedData: { [date: string]: { followers: number, views: number, likes: number, comments: number } } = {};
      metricSnapshots.forEach(snap => {
        const dateStr = format(snap.date.toDate(), 'dd/MM');
        if (!combinedData[dateStr]) {
          combinedData[dateStr] = { followers: 0, views: 0, likes: 0, comments: 0 };
        }
        combinedData[dateStr].followers += parseMetric(snap.followers);
        combinedData[dateStr].views += parseMetric(snap.views);
        combinedData[dateStr].likes += parseMetric(snap.likes);
        combinedData[dateStr].comments += parseMetric(snap.comments);
      });
      return Object.entries(combinedData)
        .map(([date, metrics]) => ({ date, ...metrics }))
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
        .slice(-30);

    } else {
      return metricSnapshots
        .filter(snap => snap.platform === selectedPlatform)
        .map(snap => ({
            date: format(snap.date.toDate(), 'dd/MM'),
            followers: parseMetric(snap.followers),
            views: parseMetric(snap.views),
            likes: parseMetric(snap.likes),
            comments: parseMetric(snap.comments),
        })).reverse().slice(-30);
    }
  }, [metricSnapshots, selectedPlatform]);


  const handleToggleIdeia = async (ideia: IdeiaSalva) => {
    if (!firestore || !user) return;
    const ideaRef = doc(firestore, `users/${user.uid}/ideiasSalvas`, ideia.id);
    try {
        await updateDoc(ideaRef, { 
            concluido: !ideia.concluido,
            completedAt: !ideia.concluido ? new Date() : null,
        });
        toast({ title: "Tarefa atualizada!"});
    } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: 'destructive'})
    }
  };

  const handleToggleRoteiro = async (toggledItem: ItemRoteiro, index: number) => {
    if (!firestore || !roteiro) return;
    const roteiroRef = doc(firestore, 'roteiro', roteiro.id);
    const updatedItems = roteiro.items.map((item, i) => 
        i === index ? { ...item, concluido: !item.concluido } : item
    );
    try {
        await updateDoc(roteiroRef, { items: updatedItems });
    } catch (e: any) {
        toast({ title: "Erro ao atualizar roteiro", description: e.message, variant: 'destructive'});
    }
  };
  
  const handleMarkAsPublished = async (postId: string) => {
    if (!firestore || !user) return;
    const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, postId);
    try {
        await updateDoc(postRef, { status: 'Publicado' });
        toast({ title: "Post marcado como publicado!"});
    } catch(e: any) {
        toast({ title: "Erro", description: e.message, variant: 'destructive'})
    }
  };


  const visibleItems = roteiro?.items.slice(0, 3);
  const collapsibleItems = roteiro?.items.slice(3);
  
  const chartConfig = platformChartConfig[selectedPlatform] || platformChartConfig.total;

  const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
        if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
        if (num >= 1000) return num.toLocaleString('pt-BR');
        return String(num);
    };

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<LayoutGrid className="text-primary" />}
        title={`Bem-vindo(a) de volta, ${
          userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Criador'
        }!`}
        description="Seu centro de comando para crescimento e monetização."
      />

      <div className="space-y-8">
        <ProfileCompletionAlert userProfile={userProfile} hasUpdatedToday={hasUpdatedToday} isPremium={isPremium} />

        {/* Métricas e Publicações */}
        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
            <CardHeader className="flex flex-col gap-4 sm:flex-row items-start sm:items-center justify-between pb-4">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  Visão Geral da Plataforma
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                   <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">Total</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  {userProfile && <UpdateMetricsModal userProfile={userProfile} />}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 justify-center">
                      <MetricCard icon={Users} title="Seguidores" value={formatMetricValue(latestMetrics?.followers)} handle={selectedPlatform !== 'total' ? latestMetrics?.handle as string : undefined} isLoading={isLoading} />
                      <MetricCard icon={Eye} title={selectedPlatform === 'tiktok' ? "Média de Views" : "Views (Manual)"} value={formatMetricValue(latestMetrics?.views)} isManual={selectedPlatform !== 'tiktok'} isLoading={isLoading} />
                      <MetricCard icon={Heart} title="Média de Likes" value={formatMetricValue(latestMetrics?.likes)} isLoading={isLoading} />
                      <MetricCard icon={MessageSquare} title="Média de Comentários" value={formatMetricValue(latestMetrics?.comments)} isLoading={isLoading} />
                  </div>

                  {selectedPlatform === 'instagram' && (
                    isFetchingPosts ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : instaPosts && userProfile?.instagramHandle ? (
                        <InstagramProfileResults profile={{
                            id: '', username: userProfile.instagramHandle,
                            followersCount: parseMetric(userProfile.instagramFollowers),
                            isPrivate: false, isBusiness: true, profilePicUrlHd: '', biography: '', fullName: '', mediaCount: 0, followingCount: 0
                        }} posts={instaPosts} formatNumber={formatNumber} error={null} />
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Integre sua conta do Instagram no seu <Link href="/profile" className='text-primary font-semibold hover:underline'>perfil</Link> para ver seus posts aqui.</p>
                        </div>
                    )
                  )}

                  {selectedPlatform === 'tiktok' && (
                     isFetchingPosts ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : tiktokPosts && userProfile?.tiktokHandle ? (
                        <TikTokProfileResults profile={{
                            id: '', username: userProfile.tiktokHandle,
                            followersCount: parseMetric(userProfile.tiktokFollowers),
                            nickname: '', avatarUrl: '', bio: '', isVerified: false, isPrivate: false, heartsCount: 0, videoCount: 0, followingCount: 0
                        }} posts={tiktokPosts} formatNumber={formatNumber} error={null} />
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Integre sua conta do TikTok no seu <Link href="/profile" className='text-primary font-semibold hover:underline'>perfil</Link> para ver seus vídeos aqui.</p>
                        </div>
                    )
                  )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-3 space-y-8">
                {/* Gráfico Histórico */}
                <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0 h-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl">
                        Evolução das Métricas ({selectedPlatform === 'instagram' ? 'Instagram' : selectedPlatform === 'tiktok' ? 'TikTok' : 'Total'})
                        </CardTitle>
                        <CardDescription>Acompanhe seu progresso ao longo dos últimos 30 dias.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2 pr-6">
                        {isLoading ? <Skeleton className="h-[350px] w-full" /> : 
                        historicalChartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <BarChart accessibilityLayer data={historicalChartData} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                                <RechartsTooltip content={<ChartTooltipContent indicator="dot" />} />
                                <Bar dataKey="followers" fill="var(--color-followers)" radius={4} name="Seguidores" />
                                <Bar dataKey="views" fill="var(--color-views)" radius={4} name="Views (Manual)"/>
                                <Bar dataKey="likes" fill="var(--color-likes)" radius={4} name="Likes"/>
                                <Bar dataKey="comments" fill="var(--color-comments)" radius={4} name="Comentários"/>
                            </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] w-full flex items-center justify-center text-center p-4 rounded-xl bg-muted/50 border border-dashed">
                                <div>
                                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                                <h3 className="font-semibold text-foreground">
                                    {userProfile?.instagramHandle || userProfile?.tiktokHandle ? "Dados insuficientes para o gráfico." : "Nenhuma plataforma conectada."}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {userProfile && (
                                        <UpdateMetricsModal userProfile={userProfile} triggerButton={
                                            <span className="text-primary font-medium hover:underline cursor-pointer">
                                                Atualize suas métricas
                                            </span>
                                        } />
                                    )}
                                    {userProfile?.instagramHandle || userProfile?.tiktokHandle ? " por alguns dias para começar." : " para começar a ver seus dados."}
                                </p>
                                </div>
                            </div>
                        )
                        }
                    </CardContent>
                </Card>
            </div>
            <div className="xl:col-span-2 space-y-8">
                 <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0 flex flex-col h-full">
                  <CardHeader className="text-center sm:text-left">
                    <CardTitle className="font-headline text-xl">
                      Próximos Posts Agendados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex-grow flex flex-col'>
                    {isLoadingUpcoming ? <Skeleton className="h-28 w-full" /> : (
                        upcomingContent && upcomingContent.length > 0 ? (
                        <div className="space-y-4 flex-grow flex flex-col">
                            {upcomingContent.map((post) => (
                            <div
                                key={post.id}
                                className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4 text-left"
                            >
                                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Tag className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold text-foreground text-sm leading-tight truncate">
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleMarkAsPublished(post.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>Marcar como Publicado</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            ))}
                            <div className='mt-auto pt-4'>
                            <Button variant="link" asChild className="w-full">
                                <Link href="/content-calendar">
                                Ver calendário completo
                                </Link>
                            </Button>
                            </div>
                        </div>
                        ) : (
                        <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed flex-grow flex flex-col items-center justify-center">
                            <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                            <h3 className="font-semibold text-foreground">
                            Nenhum post futuro.
                            </h3>
                            <p className="text-sm text-muted-foreground">
                            Agende seu próximo conteúdo no calendário.
                            </p>
                        </div>
                        )
                    )}
                  </CardContent>
                </Card>
            </div>
        </div>


        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0 h-full">
                <CardHeader className="text-center sm:text-left">
                  <CardTitle className="font-headline text-xl">
                    Roteiro de Conteúdo Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRoteiro ? <Skeleton className="h-40 w-full" /> : (
                      roteiro && roteiro.items.length > 0 ? (
                      <div>
                          <ul className="space-y-2">
                              {visibleItems?.map((item, index) => (
                              <li key={index}>
                                  <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50 text-left">
                                  <Checkbox
                                      id={`roteiro-${index}`}
                                      checked={item.concluido}
                                      onCheckedChange={() => handleToggleRoteiro(item, index)}
                                      className="h-5 w-5 mt-1"
                                  />
                                  <div>
                                      <label
                                      htmlFor={`roteiro-${index}`}
                                      className={cn(
                                          'font-medium text-base transition-colors cursor-pointer',
                                          item.concluido
                                          ? 'line-through text-muted-foreground'
                                          : 'text-foreground'
                                      )}
                                      >
                                      <span className="font-semibold text-primary">
                                          {item.dia}:
                                      </span>{' '}
                                      {item.tarefa}
                                      </label>
                                      <p className="text-sm text-muted-foreground">
                                      {item.detalhes}
                                      </p>
                                  </div>
                                  </div>
                                  {visibleItems && index < visibleItems.length - 1 && (
                                  <Separator className="my-2" />
                                  )}
                              </li>
                              ))}
                              <AnimatePresence>
                              {isExpanded && collapsibleItems?.map((item, index) => (
                                  <motion.li 
                                  key={`collapsible-${index}`}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                  >
                                      <Separator className="my-2" />
                                      <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50 text-left">
                                      <Checkbox
                                          id={`roteiro-collapsible-${index}`}
                                          checked={item.concluido}
                                          onCheckedChange={() => handleToggleRoteiro(item, 3 + index)}
                                          className="h-5 w-5 mt-1"
                                      />
                                      <div>
                                          <label
                                          htmlFor={`roteiro-collapsible-${index}`}
                                          className={cn(
                                              'font-medium text-base transition-colors cursor-pointer',
                                              item.concluido
                                              ? 'line-through text-muted-foreground'
                                              : 'text-foreground'
                                          )}
                                          >
                                          <span className="font-semibold text-primary">
                                              {item.dia}:
                                          </span>{' '}
                                          {item.tarefa}
                                          </label>
                                          <p className="text-sm text-muted-foreground">
                                          {item.detalhes}
                                          </p>
                                      </div>
                                      </div>
                                  </motion.li>
                              ))}
                              </AnimatePresence>
                          </ul>
                          {collapsibleItems && collapsibleItems.length > 0 && !isExpanded && (
                          <div className='flex justify-center mt-2'>
                              <Button 
                                  variant="ghost" 
                                  onClick={() => setIsExpanded(true)} 
                                  className="text-primary hover:text-primary"
                              >
                                  Ver restante da semana
                              </Button>
                          </div>
                          )}
                          {isExpanded && (
                          <div className='flex justify-center mt-2'>
                              <Button 
                                  variant="ghost" 
                                  onClick={() => setIsExpanded(false)} 
                                  className="text-primary hover:text-primary"
                              >
                                  Ver menos
                              </Button>
                          </div>
                          )}
                      </div>
                      ) : (
                      <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed">
                          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                          <h3 className="font-semibold text-foreground">
                          Sem roteiro para a semana.
                          </h3>
                          <p className="text-sm text-muted-foreground">
                          Gere um novo no{' '}
                          <Link
                              href="/generate-weekly-plan"
                              className="text-primary font-medium hover:underline"
                          >
                              Planejamento Semanal
                          </Link>
                          .
                          </p>
                      </div>
                      )
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1 space-y-8">
                <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0 h-full">
                <CardHeader className="text-center sm:text-left">
                  <CardTitle className="font-headline text-xl">
                    Ideias e Tarefas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingIdeias ? <Skeleton className="h-24 w-full" /> : (
                      ideiasSalvas && ideiasSalvas.length > 0 ? (
                      <ul className="space-y-3">
                          {ideiasSalvas.map((ideia) => (
                          <li key={ideia.id} className="flex items-start gap-3 text-left">
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
                                  Salvo de "{ideia.origem}"{' '}
                                  {ideia.createdAt &&
                                  formatDistanceToNow(ideia.createdAt.toDate(), {
                                      addSuffix: true,
                                      locale: ptBR,
                                  })}
                              </p>
                              </div>
                          </li>
                          ))}
                      </ul>
                      ) : (
                      <div className="text-center py-8 px-4 rounded-xl bg-muted/50 border border-dashed h-full flex flex-col justify-center">
                          <Rocket className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                          <h3 className="font-semibold text-foreground">
                          Comece a Gerar Ideias!
                          </h3>
                          <p className="text-sm text-muted-foreground">
                          Suas ideias e tarefas salvas aparecerão aqui.
                          </p>
                      </div>
                      )
                  )}
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
}


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
                                    <div className="relative aspect-square">
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
                            <CarouselItem key={post.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                                <Card className="overflow-hidden">
                                    <div className="relative aspect-[9/16]">
                                        <Image src={post.coverUrl} alt={post.description || 'TikTok Video'} fill style={{ objectFit: 'cover' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-4 text-white">
                                            <div className="flex items-center gap-4 text-sm">
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
    

    

    

    

    



    