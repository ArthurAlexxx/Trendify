
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
  Check,
  CalendarPlus,
  Target,
  Pencil,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
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
  InstagramPostData,
  TikTokProfileData,
  TikTokPostData,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow, isToday, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
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
import { collection, doc, query, orderBy, limit, updateDoc, where, addDoc, serverTimestamp, getDocs, Timestamp, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getTikTokPosts, getInstagramPosts } from '@/app/(app)/profile/actions';
import { useSubscription } from '@/hooks/useSubscription';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard, InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';


const chartConfigBase = {
  followers: { label: "Seguidores" },
  views: { label: "Views" },
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


const followerGoalSchema = z.object({
    totalFollowerGoal: z.number().optional(),
    instagramFollowerGoal: z.number().optional(),
    tiktokFollowerGoal: z.number().optional(),
});

const ProfileCompletionAlert = ({ userProfile, isPremium }: { userProfile: UserProfile | null, isPremium: boolean }) => {
    const isProfileSetup = userProfile?.niche && (userProfile.instagramHandle || userProfile.tiktokHandle);
    const hasAnyPlatform = userProfile?.instagramHandle || userProfile.tiktokHandle;

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
                   {userProfile && isPremium && (
                        <Button asChild className='w-full sm:w-auto'>
                           <Link href="/profile/integrations">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Conectar Plataformas
                           </Link>
                        </Button>
                   )}
                   {!isPremium && (
                       <Button asChild className='w-full sm:w-auto'>
                           <Link href="/subscribe">Ver Planos</Link>
                       </Button>
                   )}
                </div>
            </Alert>
         )
    }
    
    return null;
}

const FollowerGoalSheet = ({ userProfile, children }: { userProfile: UserProfile, children: React.ReactNode }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    
    const form = useForm<z.infer<typeof followerGoalSchema>>({
        resolver: zodResolver(followerGoalSchema),
        defaultValues: {
            totalFollowerGoal: userProfile.totalFollowerGoal || 0,
            instagramFollowerGoal: userProfile.instagramFollowerGoal || 0,
            tiktokFollowerGoal: userProfile.tiktokFollowerGoal || 0,
        }
    });

    useEffect(() => {
        if(userProfile) {
            form.reset({
                totalFollowerGoal: userProfile.totalFollowerGoal || 0,
                instagramFollowerGoal: userProfile.instagramFollowerGoal || 0,
                tiktokFollowerGoal: userProfile.tiktokFollowerGoal || 0,
            });
        }
    }, [userProfile, form]);

    const onSubmit = (data: z.infer<typeof followerGoalSchema>) => {
        if (!user) return;
        startTransition(async () => {
            try {
                await updateDoc(doc(firestore, "users", user.uid), {
                    totalFollowerGoal: data.totalFollowerGoal,
                    instagramFollowerGoal: data.instagramFollowerGoal,
                    tiktokFollowerGoal: data.tiktokFollowerGoal,
                });
                toast({ title: "Sucesso!", description: "Suas metas de seguidores foram atualizadas." });
                setIsOpen(false);
            } catch (e: any) {
                toast({ title: "Erro", description: e.message, variant: "destructive" });
            }
        });
    }

    const renderNumericInput = (name: keyof z.infer<typeof followerGoalSchema>) => (
         <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                            className="h-11"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="font-headline text-xl">Definir Metas de Seguidores</SheetTitle>
                    <SheetDescription>
                        Defina suas metas para cada plataforma ou uma meta geral. Isso ajudará a IA a criar estratégias melhores.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="totalFollowerGoal">Meta Total (Insta + TikTok)</Label>
                            {renderNumericInput('totalFollowerGoal')}
                        </div>
                         <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="instagramFollowerGoal">Meta do Instagram</Label>
                            {renderNumericInput('instagramFollowerGoal')}
                        </div>
                         <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="tiktokFollowerGoal">Meta do TikTok</Label>
                           {renderNumericInput('tiktokFollowerGoal')}
                        </div>
                         <SheetFooter className='pt-2'>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Metas
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
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
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [currentTikTokUrl, setCurrentTikTokUrl] = useState('');


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

    if (userProfile) {
        fetchPosts();
    }
  }, [userProfile]);

  const handleTikTokClick = (post: TikTokPostData) => {
    if (post.shareUrl) {
        setCurrentTikTokUrl(post.shareUrl);
        setShowTikTokModal(true);
    }
  };


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

  const isLoading = isLoadingProfile || isLoadingRoteiro || isLoadingIdeias || isLoadingUpcoming || isLoadingMetrics || isSubscriptionLoading;
  
  const parseMetric = (value?: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
  
    // Replace comma with dot for decimal conversion, remove dots for thousands
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(
      cleanedValue.replace(/K/gi, 'e3').replace(/M/gi, 'e6')
    );
    return isNaN(num) ? 0 : num;
  };

   const formatMetricValue = (value?: string | number): string => {
    if (value === undefined || value === null) return '—';
    const num = typeof value === 'string' ? parseMetric(value) : value;
     if (num === 0) return 'N/A';

    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(0)}K`;
    if (num >= 1000) return num.toLocaleString('pt-BR');
    return String(num);
  };
  
  const { currentFollowers, goalFollowers } = useMemo(() => {
    if (!userProfile) return { currentFollowers: 0, goalFollowers: 0 };
    switch (selectedPlatform) {
      case 'instagram':
        return {
          currentFollowers: parseMetric(userProfile.instagramFollowers),
          goalFollowers: userProfile.instagramFollowerGoal || 0,
        };
      case 'tiktok':
        return {
          currentFollowers: parseMetric(userProfile.tiktokFollowers),
          goalFollowers: userProfile.tiktokFollowerGoal || 0,
        };
      case 'total':
      default:
        return {
          currentFollowers: parseMetric(userProfile.instagramFollowers) + parseMetric(userProfile.tiktokFollowers),
          goalFollowers: userProfile.totalFollowerGoal || 0,
        };
    }
  }, [userProfile, selectedPlatform]);
  
  const followerGoalProgress = goalFollowers > 0 ? Math.min((currentFollowers / goalFollowers) * 100, 100) : 0;
  
  const latestMetrics = useMemo(() => {
    if (!userProfile) return null;
    if (selectedPlatform === 'total') {
        const hasInsta = !!userProfile.instagramHandle;
        const hasTiktok = !!userProfile.tiktokHandle;

        return {
            handle: hasInsta && hasTiktok ? 'Total' : hasInsta ? userProfile.instagramHandle : hasTiktok ? userProfile.tiktokHandle : 'N/A',
            views: parseMetric(userProfile.instagramAverageViews) + parseMetric(userProfile.tiktokAverageViews),
            likes: parseMetric(userProfile.instagramAverageLikes) + parseMetric(userProfile.tiktokAverageLikes),
            comments: parseMetric(userProfile.instagramAverageComments) + parseMetric(userProfile.tiktokAverageComments),
        }
    }
    return selectedPlatform === 'instagram' ? {
        handle: userProfile.instagramHandle,
        views: parseMetric(userProfile.instagramAverageViews),
        likes: parseMetric(userProfile.instagramAverageLikes),
        comments: parseMetric(userProfile.instagramAverageComments),
    } : {
        handle: userProfile.tiktokHandle,
        views: parseMetric(userProfile.tiktokAverageViews),
        likes: parseMetric(userProfile.tiktokAverageLikes),
        comments: parseMetric(userProfile.tiktokAverageComments),
    }
  }, [userProfile, selectedPlatform]);

  const historicalChartData = useMemo(() => {
    if (!metricSnapshots || metricSnapshots.length === 0) return [];
  
    // Filter snapshots based on selected platform
    let platformSnapshots = metricSnapshots;
    if (selectedPlatform !== 'total') {
        platformSnapshots = metricSnapshots.filter(snap => snap.platform === selectedPlatform);
    }
  
    // Group snapshots by day string to combine data if needed (for 'total' view)
    const groupedByDay = platformSnapshots.reduce((acc, snap) => {
        const dayStr = format(snap.date.toDate(), 'yyyy-MM-dd');
        if (!acc[dayStr]) {
            acc[dayStr] = {
                date: snap.date.toDate(),
                followers: 0,
                views: 0,
                likes: 0,
                comments: 0,
            };
        }
        acc[dayStr].followers += parseMetric(snap.followers);
        acc[dayStr].views += parseMetric(snap.views);
        acc[dayStr].likes += parseMetric(snap.likes);
        acc[dayStr].comments += parseMetric(snap.comments);
        return acc;
    }, {} as Record<string, { date: Date; followers: number; views: number; likes: number; comments: number }>);
  
    // Convert to an array, sort by date, and take the last 7 entries
    const sortedDaysData = Object.values(groupedByDay)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Take the last 7 days of data if available, otherwise take all available data
    const chartData = sortedDaysData.slice(-(sortedDaysData.length > 7 ? 7 : sortedDaysData.length));

    // Format for the chart
    return chartData.map(dayData => ({
        date: format(dayData.date, 'dd/MM'),
        followers: dayData.followers,
        views: dayData.views,
        likes: dayData.likes,
        comments: dayData.comments,
    }));
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
    
    // Find the original index in the full list
    const originalIndex = roteiro.items.findIndex(item => item.tarefa === toggledItem.tarefa && item.dia === toggledItem.dia);
    
    if (originalIndex === -1) return;

    const updatedItems = roteiro.items.map((item, i) => 
        i === originalIndex ? { ...item, concluido: !item.concluido } : item
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

  const diaDaSemana = format(new Date(), 'EEEE', { locale: ptBR });
  const diaDaSemanaNormalizado = diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1);
  const roteiroDoDia = roteiro?.items.filter(item => item.dia.toLowerCase() === diaDaSemanaNormalizado.toLowerCase().replace('-feira', ''));

  const chartConfig = platformChartConfig[selectedPlatform] || platformChartConfig.total;

  const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
        if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
        if (num >= 1000) return num.toLocaleString('pt-BR');
        return String(num);
    };

  const pieData = [
    { name: 'progress', value: followerGoalProgress, fill: 'hsl(var(--primary))' },
    { name: 'remaining', value: 100 - followerGoalProgress, fill: 'hsl(var(--muted))' }
  ];


  return (
    <>
    <Dialog open={showTikTokModal} onOpenChange={setShowTikTokModal}>
        <DialogContent className="sm:max-w-md p-0 border-0">
            <div className="aspect-video">
                {currentTikTokUrl && (
                    <iframe
                        key={currentTikTokUrl}
                        src={`https://www.tiktok.com/embed/v2/${currentTikTokUrl.split('/').pop()}`}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media;"
                    ></iframe>
                )}
            </div>
        </DialogContent>
    </Dialog>

    <div className="space-y-8">
      <PageHeader
        title={`Bem-vindo(a) de volta, ${
          userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Criador'
        }!`}
        description="Seu centro de comando para crescimento e monetização."
      />

      <div className="space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Card className="rounded-2xl border-0">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg sm:text-xl">
                            Meta de Seguidores
                        </CardTitle>
                        <CardDescription>Acompanhe seu progresso.</CardDescription>
                         <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto pt-2">
                            <div className='w-full sm:w-auto'>
                                <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue placeholder="Selecione a plataforma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="total">Total</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            {userProfile && 
                            <FollowerGoalSheet userProfile={userProfile}>
                                <Button variant="outline" size="sm" className="w-full"><Pencil className="mr-2 h-4 w-4" /> Editar Metas</Button>
                            </FollowerGoalSheet>
                            }
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center text-center">
                            {isLoading ? <Skeleton className="h-48 w-48 rounded-full" /> : 
                            goalFollowers > 0 ? (
                            <div className='relative h-48 w-48'>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" startAngle={90} endAngle={-270} innerRadius="80%" outerRadius="100%" cornerRadius={50} paddingAngle={0} stroke="none">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold font-headline text-primary">{followerGoalProgress.toFixed(0)}%</span>
                                </div>
                            </div>
                            ) : (
                                <div className='flex flex-col items-center justify-center h-48 w-48 rounded-full border-4 border-dashed bg-muted'>
                                    <Target className="h-12 w-12 text-muted-foreground" />
                                </div>
                            )}
                            <p className="text-3xl font-bold font-headline mt-4">{formatMetricValue(currentFollowers)}</p>
                            {goalFollowers > 0 ? (
                                <p className="text-sm text-muted-foreground">de {formatMetricValue(goalFollowers)} seguidores</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Defina uma meta para começar</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-8">
                 {userProfile && <ProfileCompletionAlert userProfile={userProfile} isPremium={isPremium} />}

                <Card className="rounded-2xl border-0">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg sm:text-xl">
                            Métricas de Engajamento
                        </CardTitle>
                        <CardDescription>Views, likes e comentários para a plataforma selecionada.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2"><Eye className="h-4 w-4" />Média de Views</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-8 w-16" /> : formatMetricValue(latestMetrics?.views)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2"><Heart className="h-4 w-4" />Média de Likes</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-8 w-16" /> : formatMetricValue(latestMetrics?.likes)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Média de Comentários</h3>
                            <p className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-8 w-16" /> : formatMetricValue(latestMetrics?.comments)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-0">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg sm:text-xl">
                            Roteiro do Dia ({diaDaSemanaNormalizado})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {isLoadingRoteiro ? <Skeleton className="h-24 w-full" /> : (
                        roteiroDoDia && roteiroDoDia.length > 0 ? (
                            <ul className="space-y-3">
                                {roteiroDoDia.map((item, index) => (
                                    <li key={index}>
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id={`roteiro-dia-${index}`}
                                                checked={item.concluido}
                                                onCheckedChange={() => handleToggleRoteiro(item, index)}
                                                className="h-5 w-5 mt-0.5"
                                            />
                                            <div>
                                                <label htmlFor={`roteiro-dia-${index}`} className={cn('font-medium transition-colors cursor-pointer', item.concluido ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                                    {item.tarefa}
                                                </label>
                                                <p className="text-xs text-muted-foreground">{item.detalhes}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                           <div className="text-center py-4 rounded-xl bg-muted/50 border border-dashed">
                                <ClipboardList className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                                <h3 className="font-semibold text-foreground text-sm">
                                    Nenhuma tarefa para hoje.
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Gere um novo <Link href="/generate-weekly-plan" className="text-primary hover:underline">plano semanal</Link>.
                                </p>
                            </div>
                        )
                    )}
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                 <Card className="rounded-2xl border-0 h-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl">
                        Evolução das Métricas ({selectedPlatform === 'instagram' ? 'Instagram' : selectedPlatform === 'tiktok' ? 'TikTok' : 'Total'})
                        </CardTitle>
                        <CardDescription>Acompanhe seu progresso nos dias em que você registrou suas métricas.</CardDescription>
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
                                <Bar dataKey="views" fill="var(--color-views)" radius={4} name="Views"/>
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
                                        <Link href="/profile" className="text-primary font-medium hover:underline cursor-pointer">
                                                Atualize suas métricas
                                        </Link>
                                    )}
                                    {userProfile?.instagramHandle || userProfile?.tiktokHandle ? " para começar a ver seus dados." : " para começar."}
                                </p>
                                </div>
                            </div>
                        )
                        }
                    </CardContent>
                </Card>
            </div>
             <div className="lg:col-span-1 space-y-8">
                  <Card className="rounded-2xl border-0 flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">
                      Próximos Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex-grow flex flex-col'>
                    {isLoadingUpcoming ? <Skeleton className="h-28 w-full" /> : (
                        upcomingContent && upcomingContent.length > 0 ? (
                        <div className="space-y-4 flex-grow flex flex-col">
                            {upcomingContent.map((post) => (
                            <div
                                key={post.id}
                                className="p-3 rounded-lg border bg-background/50 flex items-start justify-between gap-4"
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
                                    {post.date && formatDistanceToNow(post.date.toDate(), {
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <Card className="rounded-2xl border-0 h-full">
                <CardHeader>
                <CardTitle className="font-headline text-xl">
                    Ideias e Tarefas Salvas
                </CardTitle>
                </CardHeader>
                <CardContent>
                {isLoadingIdeias ? <Skeleton className="h-24 w-full" /> : (
                    ideiasSalvas && ideiasSalvas.length > 0 ? (
                    <ul className="space-y-3">
                        {ideiasSalvas.map((ideia) => (
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


         {/* Recent Posts Section */}
        <div className="grid grid-cols-1 gap-8">
            <Card className="rounded-2xl border-0">
                <CardHeader>
                    <CardTitle>Atividade Recente nas Plataformas</CardTitle>
                    <CardDescription>Uma visão geral das suas últimas publicações.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isFetchingPosts ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <div className='space-y-8'>
                        {instaPosts && userProfile?.instagramHandle && (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Instagram className="h-5 w-5"/> Instagram</h3>
                                <InstagramProfileResults profile={{
                                    id: '', username: userProfile.instagramHandle,
                                    followersCount: parseMetric(userProfile.instagramFollowers),
                                    isPrivate: false, isBusiness: true, profilePicUrlHd: '', biography: '', fullName: '', mediaCount: 0, followingCount: 0
                                }} posts={instaPosts} formatNumber={formatNumber} error={null} />
                            </div>
                        )}

                        {tiktokPosts && userProfile?.tiktokHandle && (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Film className="h-5 w-5"/> TikTok</h3>
                                <TikTokProfileResults profile={{
                                    id: '', username: userProfile.tiktokHandle,
                                    followersCount: parseMetric(userProfile.tiktokFollowers),
                                    nickname: '', avatarUrl: '', bio: '', isVerified: false, isPrivate: false, heartsCount: 0, videoCount: 0, followingCount: 0
                                }} posts={tiktokPosts} formatNumber={formatNumber} error={null} onVideoClick={handleTikTokClick} />
                            </div>
                        )}

                        {!(instaPosts && userProfile?.instagramHandle) && !(tiktokPosts && userProfile?.tiktokHandle) && (
                             <div className="text-center py-10">
                                <p className="text-muted-foreground">Integre suas contas no seu <Link href="/profile" className='text-primary font-semibold hover:underline'>perfil</Link> para ver seus posts aqui.</p>
                            </div>
                        )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
    </>
  );
}
 