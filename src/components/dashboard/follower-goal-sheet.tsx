
'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose
} from '@/components/ui/responsive-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Input } from '../ui/input';

const followerGoalSchema = z.object({
    totalFollowerGoal: z.number().optional(),
    instagramFollowerGoal: z.number().optional(),
    tiktokFollowerGoal: z.number().optional(),
});

type FormData = z.infer<typeof followerGoalSchema>;

interface FollowerGoalSheetProps {
  userProfile: UserProfile;
  children: React.ReactNode;
}

export function FollowerGoalSheet({ userProfile, children }: FollowerGoalSheetProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    
    const form = useForm<FormData>({
        resolver: zodResolver(followerGoalSchema),
        defaultValues: {
            totalFollowerGoal: userProfile.totalFollowerGoal || 0,
            instagramFollowerGoal: userProfile.instagramFollowerGoal || 0,
            tiktokFollowerGoal: userProfile.tiktokFollowerGoal || 0,
        }
    });

    useEffect(() => {
        if(userProfile && isOpen) {
            form.reset({
                totalFollowerGoal: userProfile.totalFollowerGoal || 0,
                instagramFollowerGoal: userProfile.instagramFollowerGoal || 0,
                tiktokFollowerGoal: userProfile.tiktokFollowerGoal || 0,
            });
        }
    }, [userProfile, isOpen, form]);

    const onSubmit = (data: FormData) => {
        if (!user) return;
        startTransition(async () => {
            try {
                await updateDoc(doc(firestore, "users", user.uid), {
                    totalFollowerGoal: data.totalFollowerGoal,
                    instagramFollowerGoal: data.instagramFollowerGoal,
                    tiktokFollowerGoal: data.tiktokFollowerGoal,
                });
                toast({ title: "Sucesso!", description: "Suas metas de seguidores foram atualizadas." });
                setIsOpen(false);
            } catch (e: any) {
                toast({ title: "Erro", description: e.message, variant: "destructive" });
            }
        });
    }

    const renderNumericInput = (name: keyof FormData, label: string) => (
         <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input
                            type="text"
                            placeholder="0"
                            value={field.value ? field.value.toLocaleString('pt-BR') : ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(parseInt(value, 10) || 0);
                            }}
                            className="h-11"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <ResponsiveDialog isOpen={isOpen} onOpenChange={setIsOpen}>
            <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
                <ResponsiveDialogHeader className="p-6">
                    <ResponsiveDialogTitle className="font-headline text-xl">Definir Metas de Seguidores</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Defina suas metas para cada plataforma ou uma meta geral. Isso ajudará a IA a criar estratégias melhores.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="p-6 border-y">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {renderNumericInput('totalFollowerGoal', 'Meta Total (Insta + TikTok)')}
                            {renderNumericInput('instagramFollowerGoal', 'Meta do Instagram')}
                            {renderNumericInput('tiktokFollowerGoal', 'Meta do TikTok')}
                        </form>
                    </Form>
                </div>
                 <ResponsiveDialogFooter className="p-6">
                    <ResponsiveDialogClose asChild>
                       <Button type="button" variant="outline" className="w-full sm:w-auto">Cancelar</Button>
                    </ResponsiveDialogClose>
                     <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="w-full sm:w-auto">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Metas
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )
}
