
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
import { Crown, MoreHorizontal, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ChangePlanDialog } from './change-plan-dialog';
import { useState } from 'react';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  return (
    <>
    {selectedUser && (
      <ChangePlanDialog 
        isOpen={isDialogOpen} 
        setIsOpen={setIsDialogOpen}
        user={selectedUser}
      />
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
                        <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Alterar Plano</span>
                        </DropdownMenuItem>
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

