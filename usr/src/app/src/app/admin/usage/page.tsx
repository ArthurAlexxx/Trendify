
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { DailyUsage, UserProfile } from '@/lib/types';
import { collectionGroup, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Lightbulb, User, Loader2, Inbox, Activity } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAdmin } from '@/hooks/useAdmin';

interface EnrichedUsage extends DailyUsage {
  user?: UserProfile;
}

export default function UsageAdminPage() {
  const firestore = useFirestore();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const [enrichedUsage, setEnrichedUsage] = useState<EnrichedUsage[]>([]);
  const [isEnriching, setIsEnriching] = useState(true);

  // Query for all documents in the 'dailyUsage' collection group
  const usageQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(collectionGroup(firestore, 'dailyUsage')) : null),
    [firestore, isAdmin]
  );
  
  const [usageData, setUsageData] = useState<DailyUsage[] | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    if (!usageQuery) {
        setIsLoadingUsage(false);
        return;
    };
    getDocs(usageQuery).then(snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyUsage));
      setUsageData(data);
    }).finally(() => setIsLoadingUsage(false));
  }, [usageQuery]);


  useEffect(() => {
    if (!isAdmin || isLoadingUsage || !firestore) {
      if (!isAdmin && !isAdminLoading) {
        setIsEnriching(false);
      }
      return;
    }
    
    if (!usageData) {
        setIsEnriching(false);
        setEnrichedUsage([]);
        return;
    }

    const enrichData = async () => {
      setIsEnriching(true);
      const enriched: EnrichedUsage[] = [];
      const userCache = new Map<string, UserProfile>();

      for (const usage of usageData) {
        const userId = usage.id.split('_')[0]; // Assuming ID is still composite for uniqueness
        if (!userId) continue;

        let userProfile: UserProfile | undefined = userCache.get(userId);

        if (!userProfile) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', userId));
            if (userDoc.exists()) {
              userProfile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
              userCache.set(userId, userProfile);
            }
          } catch (e) {
            console.error(`Failed to fetch user profile ${userId}`, e);
          }
        }
        
        enriched.push({
            ...usage,
            user: userProfile,
        });
      }
      setEnrichedUsage(enriched.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsEnriching(false);
    };

    enrichData();
  }, [usageData, isLoadingUsage, firestore, isAdmin, isAdminLoading]);

  const totalVideoAnalyses = useMemo(() => {
    return usageData?.reduce((acc, usage) => acc + (usage.videoAnalyses || 0), 0) || 0;
  }, [usageData]);

  const totalGeracoesAI = useMemo(() => {
    return usageData?.reduce((acc, usage) => acc + (usage.geracoesAI || 0), 0) || 0;
  }, [usageData]);
  
  const isLoading = isAdminLoading || isLoadingUsage || isEnriching;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Uso da IA"
        description="Acompanhe o consumo das principais ferramentas da plataforma."
        icon={Activity}
      />
      
       <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análises de Vídeo</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalVideoAnalyses}</div>
            <p className="text-xs text-muted-foreground">Total de análises realizadas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerações de IA</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalGeracoesAI}</div>
            <p className="text-xs text-muted-foreground">Total de ideias e planos gerados.</p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="text-center">Atividade Recente</CardTitle>
          <CardDescription className="text-center">
            Logs de uso das ferramentas de IA pelos usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
           ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Análises de Vídeo</TableHead>
                    <TableHead>Gerações de IA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enrichedUsage.length > 0 ? enrichedUsage.map((usage) => (
                    <TableRow key={usage.id}>
                       <TableCell>
                          {usage.user ? (
                             <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={usage.user.photoURL ?? undefined} />
                                    <AvatarFallback>{usage.user.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className='font-semibold'>{usage.user.displayName}</p>
                                    <p className='text-xs text-muted-foreground'>{usage.user.email}</p>
                                </div>
                            </div>
                          ) : (
                            'Usuário não encontrado'
                          )}
                        </TableCell>
                        <TableCell>
                         {format(parseISO(usage.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {usage.videoAnalyses || 0}
                        </TableCell>
                         <TableCell>
                          {usage.geracoesAI || 0}
                        </TableCell>
                    </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Inbox className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

    