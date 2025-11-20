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
import { useAuth, useUser } from '@/firebase';
import { LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/login');
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Gerencie as informações da sua conta e preferências."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil Público</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas publicamente no seu Mídia Kit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={
                      user?.photoURL ??
                      'https://picsum.photos/seed/avatar/200/200'
                    }
                    alt="User Avatar"
                  />
                  <AvatarFallback>
                    {user?.email?.[0].toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline">Alterar Foto</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  defaultValue={user?.displayName ?? ''}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email ?? ''}
                  disabled
                  className="h-11"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button className="font-manrope rounded-full">
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="space-y-8">
            <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
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
                        className={buttonVariants({ variant: 'destructive' })}
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
