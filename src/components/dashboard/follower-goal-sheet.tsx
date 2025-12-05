
'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
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
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                            className="h-11"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent>
                <SheetHeader className="p-6">
                    <SheetTitle className="font-headline text-xl">Definir Metas de Seguidores</SheetTitle>
                    <SheetDescription>
                        Defina suas metas para cada plataforma ou uma meta geral. Isso ajudará a IA a criar estratégias melhores.
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {renderNumericInput('totalFollowerGoal', 'Meta Total (Insta + TikTok)')}
                            {renderNumericInput('instagramFollowerGoal', 'Meta do Instagram')}
                            {renderNumericInput('tiktokFollowerGoal', 'Meta do TikTok')}
                            <div className='pt-4'>
                                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Metas
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
