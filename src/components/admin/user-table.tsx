

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Crown, MoreHorizontal, Edit, Shield } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button, buttonVariants } from '../ui/button';
import { ChangePlanDialog } from './change-plan-dialog';
import { useState, useTransition } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '../ui/sheet';
import { changeUserRoleAction } from '@/app/(app)/admin/actions';
import { useUser } from '@/firebase';
import { useResponsiveToast } from '@/hooks/use-responsive-toast';
import { cn } from '@/lib/utils';

interface UserTableProps {
  data: UserProfile[];
}

const getPlanName = (plan: 'free' | 'pro' | 'premium' | undefined) => {
    switch(plan) {
      case 'pro': return 'PRO';
      case 'premium': return 'Premium';
      default: return 'Gratuito';
    }
};

export function UserTable({ data }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [isRoleTransitioning, startRoleTransition] = useTransition();
  const { user: adminUser } = useUser();
  const { toast } = useResponsiveToast();

  const handleOpenPlanSheet = (user: UserProfile) => {
    setSelectedUser(user);
    setIsPlanSheetOpen(true);
  };
  
  const handleOpenRoleSheet = (user: UserProfile) => {
    setSelectedUser(user);
    setIsRoleSheetOpen(true);
  };

  const handlePromoteToAdmin = () => {
    if (!adminUser || !selectedUser) {
        toast({ title: "Erro", description: "Ação não permitida.", variant: "destructive" });
        return;
    }
    startRoleTransition(async () => {
        const result = await changeUserRoleAction({
            targetUserId: selectedUser.id,
            newRole: 'admin',
            adminUserId: adminUser.uid
        });

        if (result.success) {
            toast({ title: 'Sucesso!', description: `${selectedUser.displayName} agora é um administrador.` });
            setIsRoleSheetOpen(false);
        } else {
            toast({ title: 'Erro', description: result.error, variant: 'destructive' });
        }
    });
  }

  return (
    <>
     {selectedUser && (
        <Sheet open={isRoleSheetOpen} onOpenChange={setIsRoleSheetOpen}>
            <SheetContent side="bottom" className='p-0 rounded-t-2xl'>
                <SheetHeader className="p-6 pb-4 text-center">
                    <SheetTitle className='text-center font-headline text-xl'>Promover a Administrador?</SheetTitle>
                    <SheetDescription className="text-center">
                        Esta ação concederá a <strong>{selectedUser.displayName}</strong> acesso total ao painel de administração. Você tem certeza?
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6 pt-4 bg-muted/50 flex flex-col-reverse sm:flex-row gap-2">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
                    </SheetClose>
                    <Button onClick={handlePromoteToAdmin} className={cn(buttonVariants({ variant: 'default' }), "bg-amber-600 hover:bg-amber-700 w-full sm:w-auto")}>
                        Sim, promover
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
     )}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-3">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL ?? undefined} />
                    <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                 </Avatar>
                 <div>
                    <p className='font-semibold'>{user.displayName}</p>
                    <p className='text-xs text-muted-foreground'>{user.email}</p>
                 </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={user.subscription?.plan === 'premium' ? 'default' : 'secondary'} className={user.subscription?.plan === 'premium' ? 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30' : ''}>
                {getPlanName(user.subscription?.plan)}
              </Badge>
            </TableCell>
            <TableCell>
              {user.createdAt ? format(user.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'N/A'}
            </TableCell>
             <TableCell>
              {user.role === 'admin' ? (
                <Badge>
                    <Crown className="mr-2 h-3 w-3" />
                    Admin
                </Badge>
              ) : 'Usuário'}
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        
                        <ChangePlanDialog 
                            isOpen={isPlanSheetOpen && selectedUser?.id === user.id} 
                            setIsOpen={setIsPlanSheetOpen}
                            user={user}
                        >
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenPlanSheet(user); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Alterar Plano</span>
                            </DropdownMenuItem>
                        </ChangePlanDialog>

                         {user.role !== 'admin' && (
                            <DropdownMenuItem onSelect={(e) => {e.preventDefault(); handleOpenRoleSheet(user)}}
                                className="text-amber-600 focus:text-amber-700 focus:bg-amber-100">
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Promover a Admin</span>
                            </DropdownMenuItem>
                         )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </>
  );
}
