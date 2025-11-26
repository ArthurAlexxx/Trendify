
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { DailyUsage, UserProfile } from '@/lib/types';
import { collection, collectionGroup, orderBy, query, limit, getDoc, doc } from 'firebase/firestore';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Lightbulb, User, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

interface EnrichedUsage extends DailyUsage {
  user?: UserProfile;
  dateStr: string;
}

export default function UsageAdminPage() {
  const firestore = useFirestore();
  const [enrichedUsage, setEnrichedUsage] = useState<EnrichedUsage[]>([]);
  const [isEnriching, setIsEnriching] = useState(true);

  // 1. Fetch all usage documents
  const usageQuery = useMemoFirebase(
    () => firestore ? query(collectionGroup(firestore, 'dailyUsage'), orderBy('date', 'desc'), limit(50)) : null,
    [firestore]
  );
  const { data: usageData, isLoading: isLoadingUsage } = useCollection<DailyUsage>(usageQuery);
  
  // 2. Enrich usage data with user profiles
  useEffect(() => {
    if (isLoadingUsage || !usageData || !firestore) {
      return;
    }

    const enrichData = async () => {
      setIsEnriching(true);
      const enriched: EnrichedUsage[] = [];
      const userCache = new Map<string, UserProfile>();

      for (const usage of usageData) {
        const userId = usage.id.split('_')[0]; // Assuming ID is `userId_YYYY-MM-DD` which is wrong
        // The document ID is the date, the parent doc is the user ID. Let's fix the logic
        const pathSegments = usage.ref.path.split('/');
        const realUserId = pathSegments[pathSegments.length - 3]; // .../users/{userId}/dailyUsage/{date}

        if (!realUserId) continue;

        let userProfile: UserProfile | undefined = userCache.get(realUserId);

        if (!userProfile) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', realUserId));
            if (userDoc.exists()) {
              userProfile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
              userCache.set(realUserId, userProfile);
            }
          } catch (e) {
            console.error(`Failed to fetch user profile ${realUserId}`, e);
          }
        }
        
        enriched.push({
            ...usage,
            user: userProfile,
            dateStr: usage.id
        });
      }
      setEnrichedUsage(enriched);
      setIsEnriching(false);
    };

    enrichData();
  }, [usageData, isLoadingUsage, firestore]);

  const totalVideoAnalyses = useMemo(() => {
    return usageData?.reduce((acc, usage) => acc + (usage.videoAnalyses || 0), 0) || 0;
  }, [usageData]);

  const totalGeracoesAI = useMemo(() => {
    return usageData?.reduce((acc, usage) => acc + (usage.geracoesAI || 0), 0) || 0;
  }, [usageData]);
  
  const isLoading = isLoadingUsage || isEnriching;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Uso das Funcionalidades de IA"
        description="Acompanhe o consumo das principais ferramentas de IA da plataforma."
      />
      
       <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Análises de Vídeo</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalVideoAnalyses}</div>
            <p className="text-xs text-muted-foreground">Nos últimos 50 registros de uso.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gerações de IA</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className='h-8 w-16' /> : totalGeracoesAI}</div>
            <p className="text-xs text-muted-foreground">Nos últimos 50 registros de uso.</p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Atividade de Uso Recente</CardTitle>
          <CardDescription>
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
                    {enrichedUsage.map((usage) => (
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
                         {format(parseISO(usage.dateStr), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {usage.videoAnalyses || 0}
                        </TableCell>
                         <TableCell>
                          {usage.geracoesAI || 0}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
             </Table>
           )}
           {!isLoading && (!enrichedUsage || enrichedUsage.length === 0) && (
             <div className="text-center py-20">
                <p className="text-muted-foreground">Nenhuma atividade de uso encontrada.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
