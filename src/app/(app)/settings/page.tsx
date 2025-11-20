
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
import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';


const profileFormSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  photoURL: z.string().url('URL da foto inválido.').optional().or(z.literal('')),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  niche: z.string().optional(),
  bio: z.string().optional(),
  followers: z.string().optional(),
  engagement: z.string().optional(),
  audience: z.string().optional(),
});


export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isPending, startTransition] = useTransition();


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
      instagramHandle: '',
      youtubeHandle: '',
      niche: '',
      bio: '',
      followers: '',
      engagement: '',
      audience: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        instagramHandle: userProfile.instagramHandle,
        youtubeHandle: userProfile.youtubeHandle,
        niche: userProfile.niche,
        bio: userProfile.bio,
        followers: userProfile.followers,
        engagement: userProfile.engagement,
        audience: userProfile.audience,
      });
    }
  }, [userProfile, form]);

  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    if (!user || !userProfileRef) return;
    
    startTransition(async () => {
      try {
        // Update Firestore document
        await updateDoc(userProfileRef, values);
        
        // Update Firebase Auth profile if necessary
        if (user.displayName !== values.displayName || user.photoURL !== values.photoURL) {
            await updateProfile(user, {
                displayName: values.displayName,
                photoURL: values.photoURL,
            });
        }

        toast({
          title: 'Sucesso!',
          description: 'Seu perfil foi atualizado.',
        });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        toast({
          title: 'Erro ao Atualizar',
          description: 'Não foi possível atualizar seu perfil. ' + error.message,
          variant: 'destructive',
        });
      }
    });
  };


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
                <span>Perfil & Mídia Kit</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8">
                
                <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={form.watch('photoURL') || user?.photoURL || 'https://picsum.photos/seed/avatar/200/200'}
                        alt="User Avatar"
                      />
                      <AvatarFallback>
                        {user?.email?.[0].toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="photoURL">URL da Foto</Label>
                        <Input
                          id="photoURL"
                          placeholder="https://.../sua-foto.jpg"
                          {...form.register('photoURL')}
                          className="h-11"
                        />
                    </div>
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  <Input
                    id="displayName"
                    {...form.register('displayName')}
                    className="h-11"
                  />
                  {form.formState.errors.displayName && <p className="text-sm font-medium text-destructive">{form.formState.errors.displayName.message}</p>}
                </div>

                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="instagramHandle">Instagram Handle</Label>
                      <Input
                        id="instagramHandle"
                        placeholder="@seu_usuario"
                        {...form.register('instagramHandle')}
                        className="h-11"
                      />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="youtubeHandle">YouTube Handle</Label>
                      <Input
                        id="youtubeHandle"
                        placeholder="@SeuCanal"
                        {...form.register('youtubeHandle')}
                        className="h-11"
                      />
                    </div>
                  </div>

                 <div className="space-y-2">
                    <Label htmlFor="niche">Seu Nicho</Label>
                    <Input
                      id="niche"
                      placeholder="Ex: Lifestyle, moda e beleza sustentável"
                      {...form.register('niche')}
                      className="h-11"
                    />
                  </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="bio">Bio para Mídia Kit</Label>
                    <Textarea
                      id="bio"
                      placeholder="Uma bio curta e profissional sobre você..."
                      {...form.register('bio')}
                      className="min-h-[120px] rounded-xl"
                    />
                  </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="followers">Total de Seguidores</Label>
                      <Input id="followers" {...form.register('followers')} placeholder="Ex: 250K" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="engagement">Taxa de Engajamento</Label>
                      <Input id="engagement" {...form.register('engagement')} placeholder="Ex: 4.7%" className="h-11" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="audience">Demografia do Público</Label>
                    <Textarea
                      id="audience"
                      placeholder="Ex: Idade 18-24, 75% Mulheres, Principais locais: EUA, Reino Unido"
                      {...form.register('audience')}
                      className="min-h-[100px] rounded-xl"
                    />
                </div>


                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isPending || isProfileLoading} className="font-manrope rounded-full">
                     {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
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

    