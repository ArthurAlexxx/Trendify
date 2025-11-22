
'use client';

import {
  Briefcase,
  Lightbulb,
  LineChart,
  Newspaper,
  PanelLeft,
  Video,
  Settings,
  LogOut,
  Calendar,
  ArrowRight,
  ClipboardList,
  Crown,
  User,
  MoreHorizontal,
  Hammer,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useUser, useAuth } from '@/firebase';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from './ui/skeleton';
import { Plan } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

const navItems: { href: string; icon: React.ElementType; label: string, plan: 'pro' | 'premium' | 'free' }[] = [
  { href: '/dashboard', icon: LineChart, label: 'Painel', plan: 'pro' },
  { href: '/generate-weekly-plan', icon: ClipboardList, label: 'Planejamento', plan: 'pro' },
  { href: '/content-calendar', icon: Calendar, label: 'Calendário', plan: 'pro' },
  { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeo', plan: 'pro' },
  { href: '/video-review', icon: Video, label: 'Análise de Vídeo', plan: 'pro' },
  { href: '/publis-assistant', icon: Newspaper, label: 'Propostas & Publis', plan: 'premium' },
  { href: '/media-kit', icon: Briefcase, label: 'Mídia Kit', plan: 'premium' },
  { href: '/support', icon: Hammer, label: 'Suporte', plan: 'free' },
];

const hasAccess = (userPlan: Plan, itemPlan: 'pro' | 'premium' | 'free'): boolean => {
    if (itemPlan === 'free') return true;
    if (userPlan === 'premium') return true;
    if (userPlan === 'pro' && itemPlan === 'pro') return true;
    return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();

  const handleSignOut = () => {
    auth.signOut();
    router.push('/login');
  };
  
  const userPlan = subscription?.plan || 'free';
  const isUserActive = subscription?.status === 'active';

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="bg-sidebar border-r border-sidebar-border"
    >
      <SidebarHeader className="flex items-center p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
        >
          <div className="bg-foreground text-background h-7 w-7 flex items-center justify-center rounded-full">
            <ArrowRight className="h-4 w-4" />
          </div>
          <span className="hidden group-data-[state=expanded]:inline">
            trendify
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
         <div className="hidden group-data-[state=expanded]:block p-2 mb-2">
            {isSubscriptionLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : isUserActive && (userPlan === 'pro' || userPlan === 'premium') ? (
                 <div className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-lg border font-semibold text-sm",
                    userPlan === 'premium' ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-500" : "bg-primary/10 border-primary/20 text-primary"
                 )}>
                    <Crown className="h-4 w-4 fill-current" />
                    <span>
                        {userPlan === 'pro' && 'Plano PRO'}
                        {userPlan === 'premium' && 'Plano Premium'}
                    </span>
                </div>
            ) : (
                <Button asChild className='w-full justify-start font-bold'>
                    <Link href="/subscribe">
                        <Crown className="mr-2 h-4 w-4 fill-current" />
                        Virar PRO
                    </Link>
                </Button>
            )}
         </div>

        <SidebarMenu>
          {navItems.map((item) => {
            const accessible = item.plan === 'free' || (isUserActive && hasAccess(userPlan, item.plan));
            const button = (
                 <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                  className="h-10 justify-start"
                  disabled={!accessible}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {!accessible && item.plan === 'premium' && (
                     <Crown className="h-4 w-4 ml-auto text-yellow-400 fill-yellow-400 group-data-[state=collapsed]:hidden"/>
                  )}
                   {!accessible && item.plan === 'pro' && userPlan === 'free' && (
                     <Crown className="h-4 w-4 ml-auto text-slate-400 fill-slate-400 group-data-[state=collapsed]:hidden"/>
                  )}
                </SidebarMenuButton>
            );

            return (
                 <SidebarMenuItem key={item.label}>
                    {accessible ? (
                         <Link href={item.href}>{button}</Link>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/subscribe" className="cursor-pointer">{button}</Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>Acesse o plano {item.plan === 'pro' ? 'PRO' : 'Premium'} para liberar.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                 </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className='w-full justify-start h-auto p-2'>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL ?? undefined} alt="User avatar" />
                      <AvatarFallback>
                          {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden group-data-[state=expanded]:flex items-center gap-3 w-full">
                        <div className="w-[120px] overflow-hidden text-left ml-3">
                        <p className="text-sm font-semibold truncate">{user?.displayName ?? 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.email ?? ''}
                        </p>
                        </div>
                        <MoreHorizontal className="h-4 w-4 ml-auto" />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className='text-destructive focus:text-destructive focus:bg-destructive/10'>
                     <LogOut className="mr-2 h-4 w-4" />
                     <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

         <SidebarTrigger
            variant="ghost"
            size="icon"
            className="hidden group-data-[state=expanded]:hidden group-data-[state=collapsed]:flex h-8 w-8 absolute bottom-4 left-2"
        >
            <PanelLeft />
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
