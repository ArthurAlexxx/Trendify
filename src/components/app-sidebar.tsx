
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

const navItems: { href: string; icon: React.ElementType; label: string, plan: 'pro' | 'premium' }[] = [
  { href: '/dashboard', icon: LineChart, label: 'Painel', plan: 'pro' },
  { href: '/generate-weekly-plan', icon: ClipboardList, label: 'Planejamento', plan: 'pro' },
  { href: '/content-calendar', icon: Calendar, label: 'Calendário', plan: 'pro' },
  { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeo', plan: 'pro' },
  { href: '/video-review', icon: Video, label: 'Análise de Vídeo', plan: 'pro' },
  { href: '/publis-assistant', icon: Newspaper, label: 'Propostas & Publis', plan: 'premium' },
  { href: '/media-kit', icon: Briefcase, label: 'Mídia Kit', plan: 'premium' },
];

const hasAccess = (userPlan: Plan, itemPlan: 'pro' | 'premium'): boolean => {
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
      <SidebarHeader className="flex items-center justify-center p-4">
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
                 <div className="flex items-center justify-center gap-2 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold text-sm">
                    <Crown className="h-4 w-4 fill-current" />
                    <span>
                        {subscription?.plan === 'pro' && 'Plano PRO'}
                        {subscription?.plan === 'premium' && 'Plano Premium'}
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
            const accessible = isUserActive && hasAccess(userPlan, item.plan);
            const button = (
                 <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                  className="h-10 justify-start"
                  disabled={!accessible}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {!accessible && (
                     <Crown className="h-4 w-4 ml-auto text-yellow-400 fill-yellow-400 group-data-[state=collapsed]:hidden"/>
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
      <SidebarFooter className="p-2 flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings">
              <SidebarMenuButton tooltip="Configurações" className="h-10 justify-start" isActive={pathname === '/settings'}>
                <Settings className="h-5 w-5" />
                <span className="text-sm font-medium">Configurações</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
         <div className="flex items-center justify-between p-2 mt-auto gap-2">
            <Link href="/settings" className='flex-1 min-w-0'>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.photoURL ?? "https://picsum.photos/seed/avatar/100/100"}
                    alt="User Avatar"
                  />
                  <AvatarFallback>
                    {user?.email?.[0].toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden group-data-[state=expanded]:block w-[120px] overflow-hidden">
                  <p className="text-sm font-semibold truncate">{user?.displayName ?? 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email ?? ''}
                  </p>
                </div>
              </div>
            </Link>
            
             <SidebarTrigger
              variant="ghost"
              size="icon"
              className="hidden group-data-[state=expanded]:hidden group-data-[state=collapsed]:flex h-8 w-8"
            >
              <PanelLeft />
            </SidebarTrigger>
          </div>
      </SidebarFooter>
    </Sidebar>
  );
}
