
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
import { Crown } from 'lucide-react';

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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead className="text-right">Role</TableHead>
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
            <TableCell className="text-right">
              {user.role === 'admin' ? (
                <Badge>
                    <Crown className="mr-2 h-3 w-3" />
                    Admin
                </Badge>
              ) : 'Usuário'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
