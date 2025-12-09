

'use client';

import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { LogOut, ShieldAlert, Crown, Settings as SettingsIcon, Hammer, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { resetLastSyncAction, resetAllMetricsAction, cancelAsaasSubscriptionAction } from './actions';

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isCancelling, startCancellingTransition] = useTransition();

  const [confirmationInput, setConfirmationInput] = useState('');
  const [resetType, setResetType] = useState<'lastSync' | 'all' | null>(null);
  const [isResetting, startResettingTransition] = useTransition();


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const { subscription, isLoading: isSubscriptionLoading, isTrialActive, trialDaysLeft } = useSubscription();


  const handleCancelSubscription = () => {
    if (!user || !userProfile || !userProfile.subscription || !userProfile.subscription.asaasSubscriptionId) {
       toast({ title: "Erro", description: "Não foi possível encontrar o ID da sua assinatura para o cancelamento.", variant: "destructive" });
       return;
    };

    startCancellingTransition(async () => {
        const result = await cancelAsaasSubscriptionAction({
            userId: user.uid,
            asaasSubscriptionId: userProfile.subscription.asaasSubscriptionId!
        });

        if (result.success) {
            toast({
                title: 'Assinatura Cancelada',
                description: 'Sua assinatura foi cancelada e seu plano revertido para o gratuito.',
            });
        } else {
             toast({
                title: 'Erro ao Cancelar',
                description: result.error || 'Não foi possível cancelar sua assinatura. Tente novamente.',
                variant: 'destructive',
            });
        }
    });
};

  const getPlanName = (plan: 'free' | 'pro' | 'premium') => {
    switch(plan) {
      case 'pro': return 'PRO';
      case 'premium': return 'Premium';
      default: return 'Gratuito';
    }
  };
  
  const handleReset = () => {
    if (!user) return;
    startResettingTransition(async () => {
      let result;
      if (resetType === 'lastSync') {
        result = await resetLastSyncAction({ userId: user.uid });
      } else if (resetType === 'all') {
        result = await resetAllMetricsAction({ userId: user.uid });
      }

      if (result?.success) {
        toast({ title: 'Sucesso!', description: 'As métricas foram resetadas.' });
      } else {
        toast({ title: 'Erro', description: result?.error || "Ocorreu um erro.", variant: 'destructive' });
      }
      setConfirmationInput('');
      setResetType(null);
    });
  };

  const confirmationText = resetType === 'lastSync'
    ? 'resetar última sincronização'
    : 'resetar todas as métricas';
    
  const isConfirmationButtonDisabled = isResetting || confirmationInput !== confirmationText;


  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Gerencie sua assinatura e informações da conta."
        icon={SettingsIcon}
      />

       <Card className="border-0 rounded-2xl shadow-primary-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
                Seu Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSubscriptionLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            ) : subscription ? (
                <div className="border rounded-lg p-6 flex flex-col items-center justify-between gap-4 bg-muted/30 text-center sm:flex-row sm:text-left">
                    <div>
                        <h4 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
                            Plano {subscription.plan && getPlanName(subscription.plan)}
                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                              {isTrialActive ? 'Em Teste' : subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                        </h4>
                        {isTrialActive && (
                           <p className="text-sm text-muted-foreground">
                                Seu teste gratuito termina em {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}.
                           </p>
                        )}
                        {subscription.status === 'active' && !isTrialActive && userProfile?.subscription?.expiresAt && userProfile.subscription.expiresAt.toDate && (
                            <p className="text-sm text-muted-foreground">
                                Acesso até {format(userProfile.subscription.expiresAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
                            </p>
                        )}
                         {subscription.plan === 'free' && !isTrialActive && (
                            <p className="text-sm text-muted-foreground">
                                Faça upgrade para desbloquear todas as funcionalidades.
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                            <Link href="/subscribe">Ver Planos</Link>
                        </Button>
                        {userProfile?.subscription?.asaasSubscriptionId && subscription.plan !== 'free' && subscription.status === 'active' && !isTrialActive ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isCancelling} className="w-full sm:w-auto">
                                        {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Cancelar Assinatura
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Sua assinatura na Asaas será cancelada e não haverá cobranças futuras. Seu acesso continuará até o final do período já pago.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCancelSubscription}>
                                            Sim, cancelar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : null}
                    </div>
                </div>
            ) : null}
          </CardContent>
       </Card>

        <Card className="border-destructive/50 bg-destructive/5 rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-destructive font-headline text-xl">
                    <ShieldAlert className="h-6 w-6" />
                    Zona de Perigo
                </CardTitle>
                <CardDescription className="text-destructive/80">
                    Ações nesta seção são permanentes e não podem ser desfeitas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 border border-destructive/20 rounded-lg">
                    <div>
                        <h4 className="font-semibold">Resetar Última Sincronização</h4>
                        <p className="text-sm text-muted-foreground">Reverte os números da última sincronização, mantendo os perfis conectados.</p>
                    </div>
                    <AlertDialog open={resetType === 'lastSync'} onOpenChange={(open) => !open && setResetType(null)}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto mt-4 sm:mt-0" onClick={() => setResetType('lastSync')}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Resetar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Resetar Última Sincronização?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação limpará as métricas (seguidores, views, etc.) da última sincronização. Para confirmar, digite: <br/><strong className='text-foreground'>{confirmationText}</strong>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <Input
                                value={confirmationInput}
                                onChange={(e) => setConfirmationInput(e.target.value)}
                                placeholder="Digite a frase para confirmar"
                                className="my-4"
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setConfirmationInput('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleReset} disabled={isConfirmationButtonDisabled}>
                                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Reset
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between items-center p-4 border border-destructive/20 rounded-lg">
                    <div>
                        <h4 className="font-semibold">Resetar Todas as Métricas</h4>
                        <p className="text-sm text-muted-foreground">Remove todos os dados de métricas, posts e contas de redes sociais do seu perfil.</p>
                    </div>
                     <AlertDialog open={resetType === 'all'} onOpenChange={(open) => !open && setResetType(null)}>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="w-full sm:w-auto mt-4 sm:mt-0" onClick={() => setResetType('all')}>
                                <Trash2 className="mr-2 h-4 w-4" /> Resetar Tudo
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Resetar TODAS as Métricas?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação é IRREVERSÍVEL e limpará todos os seus dados de redes sociais. Para confirmar, digite: <br/><strong className='text-foreground'>{confirmationText}</strong>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                                value={confirmationInput}
                                onChange={(e) => setConfirmationInput(e.target.value)}
                                placeholder="Digite a frase para confirmar"
                                className="my-4"
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setConfirmationInput('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleReset} disabled={isConfirmationButtonDisabled} className={cn(buttonVariants({ variant: 'destructive' }))}>
                                     {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Reset Total
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>

       <Card className="border-0 rounded-2xl shadow-primary-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Suporte e Contato</CardTitle>
          <CardDescription>
            Precisa de ajuda ou tem alguma sugestão? Fale conosco.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
                <Link href="/support">
                    <Hammer className="mr-2 h-4 w-4" />
                    Ir para a página de suporte
                </Link>
            </Button>
        </CardContent>
       </Card>
    </div>
  );
}
