
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
import { LogOut, ShieldAlert, Crown, Settings as SettingsIcon } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isCancelling, startCancellingTransition] = useTransition();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const { subscription, isLoading: isSubscriptionLoading, isTrialActive, trialDaysLeft } = useSubscription();


  const handleCancelSubscription = () => {
    if (!userProfileRef) return;

    startCancellingTransition(async () => {
        try {
            await updateDoc(userProfileRef, {
                'subscription.status': 'inactive',
                'subscription.plan': 'free',
                'subscription.expiresAt': null,
                'subscription.paymentId': null,
            });
            toast({
                title: 'Assinatura Cancelada',
                description: 'Seu plano foi revertido para o gratuito.',
            });
        } catch (error: any) {
            console.error('Error cancelling subscription:', error);
            toast({
                title: 'Erro ao Cancelar',
                description: 'Não foi possível cancelar sua assinatura. Tente novamente.',
                variant: 'destructive',
            });
        }
    });
};


  const handleDeleteAccount = async () => {
    if (user) {
      try {
        await user.delete();
        toast({
          title: 'Conta Excluída',
          description: 'Sua conta foi excluída permanentemente.',
        });
        router.push('/login');
      } catch (error: any) {
        console.error('Error deleting account:', error);
        toast({
          title: 'Erro ao Excluir Conta',
          description:
            'Por segurança, pode ser necessário fazer login novamente antes de excluir a conta. ' +
            error.message,
          variant: 'destructive',
        });
      }
    }
  };
  
  const isDeleteButtonDisabled = deleteConfirmationText !== 'excluir minha conta';

  const getPlanName = (plan: 'free' | 'pro' | 'premium') => {
    switch(plan) {
      case 'pro': return 'PRO';
      case 'premium': return 'Premium';
      default: return 'Gratuito';
    }
  };
  

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Gerencie sua assinatura e informações da conta."
      />

       <Card className="border-0 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <Crown className="h-6 w-6 text-primary" />
                <span>Seu Plano</span>
            </CardTitle>
            <CardDescription>
                Detalhes do seu plano atual e gerenciamento da assinatura.
            </CardDescription>
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
                        {subscription.plan !== 'free' && subscription.status === 'active' && !isTrialActive ? (
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
                                            Seu acesso continuará até o final do período de faturamento. Após isso, sua conta será revertida para o plano gratuito.
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
            <CardTitle className="flex items-center gap-3 font-headline text-xl text-destructive">
                <ShieldAlert className="h-6 w-6" />
                <span>Zona de Perigo</span>
            </CardTitle>
            <CardDescription className="text-destructive/80">
                Ações nesta área são permanentes e não podem ser desfeitas.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-center sm:text-left">
                <p className="font-semibold text-foreground">Excluir Conta</p>
                <p className="text-muted-foreground">
                Isto irá apagar permanentemente sua conta e todos os dados.
                </p>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto mt-4 sm:mt-0"
                >
                    Excluir minha conta
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                    Você tem certeza absoluta?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Para confirmar, digite{' '}
                    <strong className="text-foreground">
                        excluir minha conta
                    </strong>{' '}
                    abaixo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Input
                    id="delete-confirm"
                    value={deleteConfirmationText}
                    onChange={(e) =>
                        setDeleteConfirmationText(e.target.value)
                    }
                    placeholder="excluir minha conta"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleteButtonDisabled}
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    >
                    Eu entendo, exclua minha conta
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </CardContent>
        </Card>
    </div>
  );
}
