
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
  useSidebar,
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
  const { isMobile } = useSidebar();

  const handleSignOut = () => {
    auth.signOut();
    router.push('/login');
  };
  
  const userPlan = subscription?.plan || 'free';
  const isUserActive = subscription?.status === 'active';

  return (
    <Sidebar
      collapsible={!isMobile ? "icon" : undefined}
      variant="inset"
      className="glass-effect"
    >
      <SidebarHeader className="flex items-center p-4 h-20 border-b border-gray-200/80">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
        >
          <div className="bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center rounded-full">
            <ArrowRight className="h-5 w-5" />
          </div>
          <span className={cn("hidden group-data-[state=expanded]:inline", { 'inline': isMobile })}>
            trendify
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
         <div className={cn("hidden group-data-[state=expanded]:block p-2 mb-2", { 'block': isMobile })}>
            {isSubscriptionLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : isUserActive && (userPlan === 'pro' || userPlan === 'premium') ? (
                 <div className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-lg border font-semibold text-sm",
                    userPlan === 'premium' ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-600" : "bg-primary/10 border-primary/20 text-primary"
                 )}>
                    <Crown className="h-4 w-4 fill-current" />
                    <span>
                        {userPlan === 'pro' && 'Plano PRO'}
                        {userPlan === 'premium' && 'Plano Premium'}
                    </span>
                </div>
            ) : (
                <Button asChild className='w-full justify-center font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg'>
                    <Link href="/subscribe">
                        <Crown className="mr-2 h-4 w-4 fill-current" />
                        Virar PRO
                    </Link>
                </Button>
            )}
         </div>

        <SidebarMenu>
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const accessible = item.plan === 'free' || (isUserActive && hasAccess(userPlan, item.plan));
            const button = (
                 <SidebarMenuButton
                  isActive={active}
                  tooltip={isMobile ? undefined : item.label}
                  className={cn("h-10 justify-start", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}
                  disabled={!accessible}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {!accessible && item.plan === 'premium' && (
                     <Crown className={cn("h-4 w-4 ml-auto text-yellow-400 fill-yellow-400", { "hidden": !isMobile && "group-data-[state=collapsed]" })}/>
                  )}
                   {!accessible && item.plan === 'pro' && userPlan === 'free' && (
                     <Crown className={cn("h-4 w-4 ml-auto text-slate-400 fill-slate-400", { "hidden": !isMobile && "group-data-[state=collapsed]" })}/>
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
      <SidebarFooter className="p-4 border-t border-gray-200/80">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className='w-full justify-start h-auto p-0 hover:bg-transparent'>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary">
                          <AvatarImage src={user?.photoURL ?? `https://i.pravatar.cc/150?u=${user?.uid}`} alt="User avatar" />
                          <AvatarFallback>
                              {user?.displayName?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("hidden group-data-[state=expanded]:flex items-center gap-3 w-full", { 'flex': isMobile })}>
                            <div className="w-[120px] overflow-hidden text-left">
                            <p className="text-sm font-semibold truncate text-foreground">{user?.displayName ?? 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email ?? ''}
                            </p>
                            </div>
                            <MoreHorizontal className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" className="w-56 mb-2">
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
                <DropdownMenuItem asChild>
                    <Link href="/support">
                        <Hammer className="mr-2 h-4 w-4" />
                        <span>Suporte</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className='text-red-500 focus:text-red-500 focus:bg-red-500/10'>
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
