
'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { changeUserPlanAction } from '@/app/admin/actions';
import { useUser } from '@/firebase';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  newPlan: z.enum(['free', 'pro', 'premium']),
  newCycle: z.enum(['monthly', 'annual']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ChangePlanSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: UserProfile;
}

export function ChangePlanSheet({ isOpen, setIsOpen, user }: ChangePlanSheetProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user: adminUser } = useUser();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPlan: user.subscription?.plan || 'free',
      newCycle: user.subscription?.cycle || 'monthly',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        newPlan: user.subscription?.plan || 'free',
        newCycle: user.subscription?.cycle || 'monthly',
      });
    }
  }, [isOpen, user, form]);

  const selectedPlan = form.watch('newPlan');

  async function onSubmit(values: FormData) {
    if (!adminUser) {
        toast({ title: "Erro de Autenticação", description: "Administrador não está logado.", variant: "destructive" });
        return;
    }
    
    startTransition(async () => {
      const result = await changeUserPlanAction({
        targetUserId: user.id,
        adminUserId: adminUser.uid,
        newPlan: values.newPlan,
        newCycle: values.newPlan !== 'free' ? values.newCycle : undefined,
      });

      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: `O plano de ${user.displayName} foi alterado para ${values.newPlan.toUpperCase()}.`,
        });
        setIsOpen(false);
      } else {
        toast({
          title: 'Erro ao Alterar Plano',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className='p-0 flex flex-col'>
        <SheetHeader className='p-6 pb-4 border-b'>
          <SheetTitle className='text-center font-headline text-xl'>Alterar Plano de Assinatura</SheetTitle>
          <SheetDescription className='text-center'>
            Alterando o plano para <strong>{user.displayName}</strong> ({user.email}).
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className='flex-1'>
            <div className='p-6'>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="newPlan"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Novo Plano</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecione um plano" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="free">Gratuito</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {selectedPlan !== 'free' && (
                        <FormField
                        control={form.control}
                        name="newCycle"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ciclo de Pagamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Selecione um ciclo" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="monthly">Mensal</SelectItem>
                                <SelectItem value="annual">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                </form>
                </Form>
            </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t flex-col sm:flex-row gap-2">
          <SheetClose asChild>
            <Button type="button" variant="outline" className='w-full sm:w-auto'>
              Cancelar
            </Button>
          </SheetClose>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
