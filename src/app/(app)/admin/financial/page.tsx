
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { WebhookLog } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpCircle, ArrowDownCircle, AlertCircle, MoreHorizontal, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

export default function FinancialAdminPage() {
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'webhookLogs'), orderBy('receivedAt', 'desc')) : null,
    [firestore]
  );
  const { data: logs, isLoading } = useCollection<WebhookLog>(logsQuery);

  const getEventType = (type: string) => {
    const types: Record<string, string> = {
      'PAYMENT_CONFIRMED': 'Pagamento Confirmado',
      'PAYMENT_RECEIVED': 'Pagamento Recebido',
      'PAYMENT_FAILED': 'Pagamento Falhou',
    };
    return types[type] || type;
  };
  
  const getEventIcon = (isSuccess: boolean, eventType: string) => {
    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    }
    if (eventType === 'PAYMENT_FAILED') {
      return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro & Webhooks"
        description="Histórico de transações e eventos recebidos do gateway de pagamento."
        icon={DollarSign}
      />

      <Card className="shadow-primary-lg">
        <CardHeader>
          <CardTitle className="text-center">Logs de Webhooks (Asaas)</CardTitle>
          <CardDescription className="text-center">
            Visualize em tempo real todos os eventos de pagamento recebidos pela plataforma.
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
                    <TableHead>Evento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs && logs.map((log) => (
                    <TableRow key={log.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                {getEventIcon(log.isSuccess, log.eventType)}
                                <span className="font-medium">{getEventType(log.eventType)}</span>
                            </div>
                        </TableCell>
                        <TableCell>{log.customerEmail || 'N/A'}</TableCell>
                        <TableCell className={log.isSuccess ? 'text-green-600' : 'text-red-600'}>
                         {formatCurrency(log.amount)}
                        </TableCell>
                        <TableCell>
                         {log.receivedAt ? format(log.receivedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                           <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Detalhes do Webhook</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/50 mt-4">
                                <pre>
                                    <code>{JSON.stringify(log.payload, null, 2)}</code>
                                </pre>
                                </ScrollArea>
                            </DialogContent>
                           </Dialog>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
             </Table>
           )}
           {!isLoading && (!logs || logs.length === 0) && (
             <div className="text-center py-20">
                <p className="text-muted-foreground">Nenhum registro de transação encontrado.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
