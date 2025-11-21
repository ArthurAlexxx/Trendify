
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  niche: z.string().optional(),
  bio: z.string().optional(),
  followers: z.string().optional(),
  averageViews: z.string().optional(),
  averageLikes: z.string().optional(),
  averageComments: z.string().optional(),
  audience: z.string().optional(),
});


export default function ProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
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
      instagramHandle: '',
      youtubeHandle: '',
      niche: '',
      bio: '',
      followers: '',
      averageViews: '',
      averageLikes: '',
      averageComments: '',
      audience: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        instagramHandle: userProfile.instagramHandle || '',
        youtubeHandle: userProfile.youtubeHandle || '',
        niche: userProfile.niche || '',
        bio: userProfile.bio || '',
        followers: userProfile.followers || '',
        averageViews: userProfile.averageViews || '',
        averageLikes: userProfile.averageLikes || '',
        averageComments: userProfile.averageComments || '',
        audience: userProfile.audience || '',
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
        if (user.displayName !== values.displayName) {
            await updateProfile(user, {
                displayName: values.displayName,
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

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<UserIcon />}
        title="Gerencie seu Perfil"
        description="Mantenha suas informações atualizadas para a IA gerar estratégias mais precisas."
      />
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
            <CardHeader className="text-center sm:text-left">
              <CardTitle className="flex items-center justify-center sm:justify-start gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil & Mídia Kit</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8 text-left">
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={undefined}
                        alt="User Avatar"
                      />
                      <AvatarFallback>
                        {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="displayName">Nome de Exibição</Label>
                        <Input
                          id="displayName"
                          {...form.register('displayName')}
                          className="h-11"
                        />
                        {form.formState.errors.displayName && <p className="text-sm font-medium text-destructive">{form.formState.errors.displayName.message}</p>}
                    </div>
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
                       <Label htmlFor="audience">Demografia do Público</Label>
                       <Input
                         id="audience"
                         placeholder="Ex: 75% Mulheres, 18-24 anos"
                         {...form.register('audience')}
                         className="h-11"
                       />
                    </div>
                </div>

                 <div className="grid sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="averageViews">Média de Views</Label>
                      <Input id="averageViews" {...form.register('averageViews')} placeholder="Ex: 15.5K" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="averageLikes">Média de Likes</Label>
                      <Input id="averageLikes" {...form.register('averageLikes')} placeholder="Ex: 890" className="h-11" />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="averageComments">Média de Comentários</Label>
                      <Input id="averageComments" {...form.register('averageComments')} placeholder="Ex: 120" className="h-11" />
                    </div>
                </div>


                <div className="flex justify-center sm:justify-end pt-2">
                  <Button type="submit" disabled={isPending || isProfileLoading} className="font-manrope rounded-full w-full sm:w-auto">
                     {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
    </div>
  );
}
