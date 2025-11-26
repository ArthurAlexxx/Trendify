
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
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { User as UserIcon, Instagram, Film, Search, Loader2, AlertTriangle, Users, Heart, MessageSquare, Clapperboard, PlayCircle, Eye, Upload, Crown, Check, RefreshCw, Link2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { updateProfile } from 'firebase/auth';
import type { UserProfile, InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPostData } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getInstagramProfile, getTikTokPosts, getTikTokProfile, getInstagramPosts } from './actions';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { InstagramProfileResults, TikTokProfileResults } from '@/components/dashboard/platform-results';
import { initializeFirebase } from '@/firebase';


const profileFormSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  photoURL: z.string().url().optional().nullable(),
  niche: z.string().optional(),
  bio: z.string().optional(),
  audience: z.string().optional(),
  instagramHandle: z.string().optional(),
  instagramFollowers: z.string().optional(),
  instagramAverageViews: z.string().optional(),
  instagramAverageLikes: z.string().optional(),
  instagramAverageComments: z.string().optional(),
  tiktokHandle: z.string().optional(),
  tiktokFollowers: z.string().optional(),
  tiktokAverageViews: z.string().optional(),
  tiktokAverageLikes: z.string().optional(),
  tiktokAverageComments: z.string().optional(),
  // --- Campos para dados da API que não são salvos diretamente no Firestore, mas usados na UI ---
  instagramProfile: z.custom<InstagramProfileData>().optional(),
  instagramPosts: z.custom<InstagramPostData[]>().optional(),
  tiktokProfile: z.custom<TikTokProfileData>().optional(),
  tiktokPosts: z.custom<TikTokPostData[]>().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';


export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      photoURL: null,
      niche: '',
      bio: '',
      audience: '',
      instagramHandle: '',
      instagramFollowers: '',
      instagramAverageViews: '',
      instagramAverageLikes: '',
      instagramAverageComments: '',
      tiktokHandle: '',
      tiktokFollowers: '',
      tiktokAverageViews: '',
      tiktokAverageLikes: '',
      tiktokAverageComments: '',
    },
  });
  
  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || null,
        niche: userProfile.niche || '',
        bio: userProfile.bio || '',
        audience: userProfile.audience || '',
        instagramHandle: userProfile.instagramHandle || '',
        instagramFollowers: userProfile.instagramFollowers || '',
        instagramAverageViews: userProfile.instagramAverageViews || '',
        instagramAverageLikes: userProfile.instagramAverageLikes || '',
        instagramAverageComments: userProfile.instagramAverageComments || '',
        tiktokHandle: userProfile.tiktokHandle || '',
        tiktokFollowers: userProfile.tiktokFollowers || '',
        tiktokAverageViews: userProfile.tiktokAverageViews || '',
        tiktokAverageLikes: userProfile.tiktokAverageLikes || '',
        tiktokAverageComments: userProfile.tiktokAverageComments || '',
      });
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
            photoURL: user.photoURL || null,
        });
    }
  }, [userProfile, user, form]);

  const onProfileSubmit = (values: ProfileFormData) => {
    if (!user || !userProfileRef) return;
    
    startSavingTransition(async () => {
      try {
        const dataToSave: Partial<UserProfile> = {
            displayName: values.displayName,
            photoURL: values.photoURL,
            niche: values.niche,
            bio: values.bio,
            audience: values.audience,
            instagramHandle: values.instagramHandle,
            instagramFollowers: values.instagramFollowers,
            instagramAverageViews: values.instagramAverageViews,
            instagramAverageLikes: values.instagramAverageLikes,
            instagramAverageComments: values.instagramAverageComments,
            tiktokHandle: values.tiktokHandle,
            tiktokFollowers: values.tiktokFollowers,
            tiktokAverageViews: values.tiktokAverageViews,
            tiktokAverageLikes: values.tiktokAverageLikes,
            tiktokAverageComments: values.tiktokAverageComments,
        };

        // Firestore does not accept 'undefined' values.
        Object.keys(dataToSave).forEach(keyStr => {
            const key = keyStr as keyof typeof dataToSave;
            if (dataToSave[key] === undefined) {
                (dataToSave as any)[key] = null;
            }
        });

        await updateDoc(userProfileRef, dataToSave);
        
        if (auth.currentUser && user.displayName !== values.displayName) {
            await updateProfile(auth.currentUser, {
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

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !auth.currentUser) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: 'Arquivo inválido', description: 'Por favor, selecione um arquivo de imagem.', variant: 'destructive'});
        return;
    }

    const { firebaseApp } = initializeFirebase();
    const storage = getStorage(firebaseApp);
    const storagePath = `profile-pictures/${user.uid}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);

    uploadTask.on(
        'state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error('Upload error:', error);
            toast({ title: 'Erro no Upload', description: 'Não foi possível enviar sua foto.', variant: 'destructive'});
            setUploadProgress(null);
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                if (auth.currentUser) {
                  await updateProfile(auth.currentUser, { photoURL: downloadURL });
                }
                if (userProfileRef) {
                    await updateDoc(userProfileRef, { photoURL: downloadURL });
                }
                form.setValue('photoURL', downloadURL);
                toast({ title: 'Sucesso!', description: 'Sua foto de perfil foi atualizada.' });
            } catch (e: any) {
                toast({ title: 'Erro ao Atualizar', description: `Não foi possível salvar a nova foto. ${e.message}`, variant: 'destructive' });
            } finally {
                setUploadProgress(null);
            }
        }
    );
};


  const isLoading = isProfileLoading;


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerencie seu Perfil"
        description="Mantenha suas informações atualizadas para a IA gerar estratégias mais precisas."
      />
          <Card className="rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil & Métricas Manuais</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA para criar estratégias.
              </CardDescription>
            </CardHeader>
            <CardContent>
             {isLoading ? (
                <div className="space-y-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                </div>
             ) : (
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <AvatarImage src={form.watch('photoURL') ?? undefined} alt="User Avatar" />
                        <AvatarFallback>
                          {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="displayName">Nome de Exibição</Label>
                        <Input
                          id="displayName"
                          {...form.register('displayName')}
                          className="h-11"
                        />
                         {uploadProgress !== null && (
                          <div className="space-y-1">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">{uploadProgress < 100 ? `Enviando... ${uploadProgress.toFixed(0)}%` : 'Finalizando...'}</p>
                          </div>
                        )}
                        {form.formState.errors.displayName && <p className="text-sm font-medium text-destructive">{form.formState.errors.displayName.message}</p>}
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
                  
                <div className="space-y-2">
                    <Label htmlFor="audience">Demografia do Público</Label>
                    <Input
                        id="audience"
                        placeholder="Ex: 75% Mulheres, 18-24 anos, localizadas no Brasil"
                        {...form.register('audience')}
                        className="h-11"
                    />
                </div>
                
                <Separator />

                {/* Instagram */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Métricas do Instagram</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramHandle">Handle do Instagram</Label>
                        <Input
                            id="instagramHandle"
                            placeholder="@seu_usuario"
                            {...form.register('instagramHandle')}
                            className="h-11"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramFollowers">Seguidores no Instagram</Label>
                        <Input id="instagramFollowers" {...form.register('instagramFollowers')} placeholder="Ex: 250K" className="h-11" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageViews">Média de Views</Label>
                        <Input id="instagramAverageViews" {...form.register('instagramAverageViews')} placeholder="Ex: 15.5K" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageLikes">Média de Likes</Label>
                        <Input id="instagramAverageLikes" {...form.register('instagramAverageLikes')} placeholder="Ex: 890" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageComments">Média de Comentários</Label>
                        <Input id="instagramAverageComments" {...form.register('instagramAverageComments')} placeholder="Ex: 120" className="h-11" />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* TikTok */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Film className="h-5 w-5" /> Métricas do TikTok</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="tiktokHandle">Handle do TikTok</Label>
                        <Input
                            id="tiktokHandle"
                            placeholder="@seu_usuario"
                            {...form.register('tiktokHandle')}
                            className="h-11"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokFollowers">Seguidores no TikTok</Label>
                        <Input id="tiktokFollowers" {...form.register('tiktokFollowers')} placeholder="Ex: 1.2M" className="h-11" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageViews">Média de Views</Label>
                        <Input id="tiktokAverageViews" {...form.register('tiktokAverageViews')} placeholder="Ex: 1M" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageLikes">Média de Likes</Label>
                        <Input id="tiktokAverageLikes" {...form.register('tiktokAverageLikes')} placeholder="Ex: 100K" className="h-11" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tiktokAverageComments">Média de Comentários</Label>
                        <Input id="tiktokAverageComments" {...form.register('tiktokAverageComments')} placeholder="Ex: 1.5K" className="h-11" />
                        </div>
                    </div>
                </div>


                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSaving || isProfileLoading} className="font-manrope rounded-full w-full sm:w-auto">
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
             )}
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl">
                  <Link2 className="h-6 w-6 text-primary" />
                  <span>Integração de Plataformas</span>
                </CardTitle>
                <CardDescription>
                  Sincronize seus dados do Instagram e TikTok para obter métricas automáticas e atualizadas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Funcionalidade Premium</AlertTitle>
                    <AlertDescription>
                        A integração automática de plataformas é um recurso exclusivo para assinantes Premium. Isso permite que a IA tenha acesso aos dados mais recentes para gerar insights e estratégias de alta precisão.
                    </AlertDescription>
                </Alert>
                <Button asChild className="mt-4">
                    <Link href="/profile/integrations">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Gerenciar Integrações
                    </Link>
                </Button>
            </CardContent>
          </Card>
    </div>
  );
}
