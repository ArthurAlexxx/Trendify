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
import { LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/login');
    });
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Configurações"
        description="Gerencie as informações da sua conta e preferências."
      />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil</span>
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
               <Button className="font-manrope rounded-full float-right">Salvar Alterações</Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <LogOut className="h-6 w-6 text-destructive" />
                <span>Sessão</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Deseja encerrar sua sessão atual em todos os dispositivos?
              </p>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full font-manrope rounded-full"
              >
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
