
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
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, initializeFirebase } from '@/firebase';
import { User as UserIcon, Instagram, Film } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';


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
});


export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<z.infer<typeof profileFormSchema>>({
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
      setLocalPhotoUrl(userProfile.photoURL || user?.photoURL || null);
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
            photoURL: user.photoURL || null,
        });
        setLocalPhotoUrl(user.photoURL || null);
    }
  }, [userProfile, user, form]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setLocalPhotoUrl(URL.createObjectURL(file));
    
    const storage = getStorage(initializeFirebase().firebaseApp);
    const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        setUploadProgress(null);
        setLocalPhotoUrl(userProfile?.photoURL || user?.photoURL || null);
        toast({
          title: 'Erro no Upload',
          description: `Não foi possível enviar sua foto. (${error.code})`,
          variant: 'destructive'
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          if (userProfileRef) {
            await updateDoc(userProfileRef, { photoURL: downloadURL });
          }
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
          }
          form.setValue('photoURL', downloadURL);
          setLocalPhotoUrl(downloadURL);
          setUploadProgress(null);
          toast({
            title: 'Sucesso!',
            description: 'Sua foto de perfil foi atualizada.',
          });
        });
      }
    );
  };

  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    if (!user || !userProfileRef || !firestore) return;
    
    startTransition(async () => {
      try {
        const { photoURL, ...firestoreData } = values;
        // Update Firestore document
        await updateDoc(userProfileRef, firestoreData);
        
        // Update Firebase Auth profile if necessary
        if (user.displayName !== values.displayName && auth.currentUser) {
            await updateProfile(auth.currentUser, {
                displayName: values.displayName,
            });
        }
        
        // Save metric snapshots
        const now = new Date();
        const metricSnapshotsRef = collection(firestore, `users/${user.uid}/metricSnapshots`);

        if (values.instagramHandle) {
             await addDoc(metricSnapshotsRef, {
                date: serverTimestamp(),
                platform: 'instagram',
                followers: values.instagramFollowers || '0',
                views: values.instagramAverageViews || '0',
                likes: values.instagramAverageLikes || '0',
                comments: values.instagramAverageComments || '0',
             });
        }
        
        if (values.tiktokHandle) {
             await addDoc(metricSnapshotsRef, {
                date: serverTimestamp(),
                platform: 'tiktok',
                followers: values.tiktokFollowers || '0',
                views: values.tiktokAverageViews || '0',
                likes: values.tiktokAverageLikes || '0',
                comments: values.tiktokAverageComments || '0',
             });
        }

        toast({
          title: 'Sucesso!',
          description: 'Seu perfil e métricas foram salvos.',
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
        icon={<UserIcon className="text-primary" />}
        title="Gerencie seu Perfil"
        description="Mantenha suas informações atualizadas para a IA gerar estratégias mais precisas."
      />
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
            <CardHeader className="text-center sm:text-left">
              <CardTitle className="flex items-center justify-center sm:justify-start gap-3 font-headline text-xl">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Perfil & Métricas</span>
              </CardTitle>
              <CardDescription>
                Essas informações serão exibidas em seu Mídia Kit e usadas pela IA para criar estratégias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-8 text-left">
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <AvatarImage
                          src={localPhotoUrl ?? undefined}
                          alt="User Avatar"
                        />
                        <AvatarFallback>
                          {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {uploadProgress !== null && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                           <p className="text-white text-sm font-bold">{Math.round(uploadProgress)}%</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="displayName">Nome de Exibição</Label>
                        <Input
                          id="displayName"
                          {...form.register('displayName')}
                          className="h-11"
                        />
                        {form.formState.errors.displayName && <p className="text-sm font-medium text-destructive">{form.formState.errors.displayName.message}</p>}
                         {uploadProgress !== null && (
                            <Progress value={uploadProgress} className="w-full h-2 mt-2" />
                        )}
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
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Instagram</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
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
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="instagramAverageViews">Média de Views (Reels)</Label>
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
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Film className="h-5 w-5" /> TikTok</h3>
                     <div className="grid sm:grid-cols-2 gap-6">
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
                    <div className="grid sm:grid-cols-3 gap-6">
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


                <div className="flex justify-center sm:justify-end pt-2">
                  <Button type="submit" disabled={isPending || isProfileLoading || uploadProgress !== null} className="font-manrope rounded-full w-full sm:w-auto">
                     {(isPending || uploadProgress !== null) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
    </div>
  );
}
