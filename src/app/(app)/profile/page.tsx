
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
import { User as UserIcon, Loader2, Upload, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useNotification } from '@/hooks/use-notification';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { initializeFirebase } from '@/firebase';


const profileFormSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  photoURL: z.string().url().optional().nullable(),
  niche: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;


export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { notify } = useNotification();
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
    },
  });
  
  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || null,
        niche: userProfile.niche || '',
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
        };

        // Firestore does not accept 'undefined' values.
        Object.keys(dataToSave).forEach(keyStr => {
            const key = keyStr as keyof typeof dataToSave;
            if (dataToSave[key] === undefined) {
                (dataToSave as any)[key] = null;
            }
        });

        await updateDoc(userProfileRef, dataToSave);
        
        if (auth.currentUser && (user.displayName !== values.displayName || user.photoURL !== values.photoURL)) {
            await updateProfile(auth.currentUser, {
                displayName: values.displayName,
                photoURL: values.photoURL ?? undefined,
            });
        }
        
        notify({
          title: 'Sucesso!',
          description: 'Seu perfil foi atualizado.',
        });
      } catch (error: any) {
        console.error('Error updating profile:', error);
        notify({
          title: 'Erro ao Atualizar',
          description: 'Não foi possível atualizar seu perfil. ' + error.message,
        });
      }
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !auth.currentUser) return;

    if (!file.type.startsWith('image/')) {
        notify({ title: 'Arquivo inválido', description: 'Por favor, selecione um arquivo de imagem.'});
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
            notify({ title: 'Erro no Upload', description: 'Não foi possível enviar sua foto.'});
            setUploadProgress(null);
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                form.setValue('photoURL', downloadURL);
                // Trigger form submission to save the new URL
                onProfileSubmit(form.getValues());
            } catch (e: any) {
                notify({ title: 'Erro ao Atualizar', description: `Não foi possível salvar a nova foto. ${e.message}` });
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
        title="Gerenciar Perfil"
        description="Mantenha suas informações atualizadas para a IA."
      />
          <Card className="rounded-2xl border-0 shadow-primary-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Seu Perfil
              </CardTitle>
              <CardDescription>
                Essas informações serão usadas pela IA para criar estratégias.
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

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSaving || isProfileLoading} className="w-full sm:w-auto">
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
             )}
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-0 shadow-primary-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">
                  Integração de Plataformas
                </CardTitle>
                <CardDescription>
                  Sincronize seus dados para obter métricas automáticas.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
