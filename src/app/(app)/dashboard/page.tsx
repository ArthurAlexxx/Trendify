
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


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


const ProfileCompletionAlert = ({ userProfile, hasUpdatedToday }: { userProfile: UserProfile | null, hasUpdatedToday: boolean }) => {
    const isProfileSetup = userProfile?.niche && (userProfile.instagramHandle || userProfile.tiktokHandle);

    if (!isProfileSetup) {
      return (
          <Alert>
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertTitle>Complete seu Perfil!</AlertTitle>
              <AlertDescription>
                  <Link href="/profile" className='hover:underline font-semibold'>Adicione seu nicho e @ de usuário</Link> para que a IA gere insights mais precisos.
              </AlertDescription>
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

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'tiktok' | 'total'>('total');

  const userProfileRef = useMemoFirebase(() => (
      firestore && user ? doc(firestore, `users/${user.uid}`) : null
  ), [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

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


  const isLoading = isLoadingProfile || isLoadingRoteiro || isLoadingIdeias || isLoadingUpcoming || isLoadingMetrics;
  
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
            likes: parseMetric(userProfile.instagramAverageLikes) + parseMetric(userProfile.tiktokAverageLikes),
            comments: parseMetric(userProfile.instagramAverageComments) + parseMetric(userProfile.tiktokAverageComments),
        }
    }
    return selectedPlatform === 'instagram' ? {
        handle: userProfile.instagramHandle,
        followers: parseMetric(userProfile.instagramFollowers),
        likes: parseMetric(userProfile.instagramAverageLikes),
        comments: parseMetric(userProfile.instagramAverageComments),
    } : {
        handle: userProfile.tiktokHandle,
        followers: parseMetric(userProfile.tiktokFollowers),
        likes: parseMetric(userProfile.tiktokAverageLikes),
        comments: parseMetric(userProfile.tiktokAverageComments),
    }
  }, [userProfile, selectedPlatform]);

  const formatMetricValue = (value?: string | number): string => {
    if (value === undefined || value === null) return '—';
    const num = typeof value === 'string' ? parseMetric(value) : value;
    if (num === 0 && (selectedPlatform === 'instagram' || selectedPlatform === 'tiktok')) return 'N/A';

    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
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
        <ProfileCompletionAlert userProfile={userProfile} hasUpdatedToday={hasUpdatedToday} />

        {/* Métricas Principais */}
        <Card className="rounded-2xl shadow-lg shadow-primary/5 border-0">
            <CardHeader className="flex flex-col gap-4 sm:flex-row items-center justify-between pb-4">
                 <CardTitle className="text-base font-medium text-muted-foreground">
                    Visão Geral da Plataforma
                  </CardTitle>
                  <div className="flex w-full flex-col sm:flex-row sm:w-auto items-center gap-2">
                   <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as any)} className="w-full sm:w-auto">
                    <TabsList className='grid w-full grid-cols-3'>
                        <TabsTrigger value="total">Total</TabsTrigger>
                        <TabsTrigger value="instagram">Instagram</TabsTrigger>
                        <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {userProfile && <UpdateMetricsModal userProfile={userProfile} />}
                  </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 justify-center">
                  <MetricCard icon={Users} title="Seguidores" value={formatMetricValue(latestMetrics?.followers)} handle={selectedPlatform !== 'total' ? latestMetrics?.handle as string : undefined} isLoading={isLoading} />
                  <MetricCard icon={Eye} title="Views (Manual)" isManual={true} isLoading={isLoading} />
                  <MetricCard icon={Heart} title="Média de Likes" value={formatMetricValue(latestMetrics?.likes)} isLoading={isLoading} />
                  <MetricCard icon={MessageSquare} title="Média de Comentários" value={formatMetricValue(latestMetrics?.comments)} isLoading={isLoading} />
                </div>
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


function MetricCard({ icon: Icon, title, value, handle, isLoading, isManual }: { icon: React.ElementType, title: string, value?: string, handle?: string, isLoading: boolean, isManual?: boolean }) {
    return (
        <div className="p-6 rounded-lg bg-muted/50 flex flex-col justify-center text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <h3 className="text-base font-medium text-muted-foreground">
                {title}
                </h3>
                <Icon className="h-4 w-4 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> :
                isManual ? (
                     <div className="flex items-center gap-2 mt-1">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <Link href="/profile" className="text-sm text-muted-foreground hover:underline">
                            Atualize no perfil
                        </Link>
                    </div>
                ) : (
                <>
                    <div className="text-3xl font-bold font-headline">
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
    

    

    

    