
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
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { LogOut, ShieldAlert, Building, Crown } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isCancelling, startCancellingTransition] = useTransition();


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();


  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/login');
    });
  };
  
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
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Gerencie as informações da sua conta e preferências."
      />

      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-6">
           <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                    <Crown className="h-6 w-6 text-primary" />
                    <span>Minha Assinatura</span>
                </CardTitle>
                <CardDescription>
                    Veja os detalhes do seu plano atual e gerencie sua assinatura.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isSubscriptionLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                ) : subscription ? (
                    <div className="border rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30">
                        <div>
                            <h4 className="text-lg font-bold flex items-center gap-2">
                                Plano {subscription.plan && getPlanName(subscription.plan)}
                                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                                    {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </h4>
                            {subscription.status === 'active' && userProfile?.subscription?.expiresAt && (
                                <p className="text-sm text-muted-foreground">
                                    Seu acesso termina em {format(userProfile.subscription.expiresAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
                                </p>
                            )}
                             {subscription.plan === 'free' && (
                                <p className="text-sm text-muted-foreground">
                                    Faça o upgrade para desbloquear todas as funcionalidades.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button asChild variant="outline">
                                <Link href="/subscribe">Ver Planos</Link>
                            </Button>
                            {subscription.plan !== 'free' && subscription.status === 'active' ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isCancelling}>
                                            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Cancelar Assinatura
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação cancelará sua assinatura. Você continuará com acesso aos recursos até o final do período de faturamento atual. Após isso, sua conta será revertida para o plano gratuito.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCancelSubscription}>
                                                Sim, quero cancelar
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
        </TabsContent>
        
        <TabsContent value="integrations" className="mt-6">
           <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                    <Building className="h-6 w-6 text-primary" />
                    <span>Integrações & Pagamentos</span>
                </CardTitle>
                <CardDescription>
                    Gerencie suas chaves de API para serviços externos como o Abacate Pay.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="abacate-api-key">Chave de API do Abacate Pay</Label>
                    <Input id="abacate-api-key" type="password" placeholder="cole_sua_chave_aqui" />
                    <p className='text-xs text-muted-foreground'>Você pode encontrar sua chave no painel do Abacate Pay.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="abacate-webhook-secret">Webhook Secret do Abacate Pay</Label>
                    <Input id="abacate-webhook-secret" type="password" placeholder="cole_seu_webhook_secret_aqui" />
                     <p className='text-xs text-muted-foreground'>Usado para verificar a autenticidade dos webhooks de pagamento.</p>
                </div>
                 <div className="flex justify-end pt-2">
                  <Button disabled className="font-manrope rounded-full">
                    Salvar Chaves
                  </Button>
                </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="space-y-8">
            <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                  <LogOut className="h-6 w-6" />
                  <span>Sessão</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-between">
                <p className="text-muted-foreground mb-4 sm:mb-0">
                  Deseja encerrar sua sessão atual neste dispositivo?
                </p>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto font-manrope rounded-full"
                >
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5 shadow-lg shadow-destructive/5 rounded-2xl">
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
                <div>
                  <p className="font-semibold text-foreground">Excluir Conta</p>
                  <p className="text-muted-foreground">
                    Isto irá apagar permanentemente sua conta e todos os dados.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto mt-4 sm:mt-0 font-manrope rounded-full"
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
                        Esta ação não pode ser desfeita. Todos os seus dados,
                        ideias salvas e agendamentos serão perdidos para sempre.
                        Para confirmar, digite{' '}
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
                        variant="destructive"
                      >
                        Eu entendo, exclua minha conta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
