
'use client';

import {
  Briefcase,
  Lightbulb,
  LineChart,
  Newspaper,
  PanelLeft,
  Settings,
  LogOut,
  Calendar,
  ArrowUpRight,
  ClipboardList,
  Crown,
  User,
  MoreHorizontal,
  Hammer,
  Sparkles,
  Link2,
  Shield,
  DollarSign,
  LayoutDashboard,
  Activity,
  Video,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useUser, useAuth } from '@/firebase';
import { Button } from './ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from './ui/skeleton';
import { Plan } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAdmin } from '@/hooks/useAdmin';

const userMenuItems: {
  category: string;
  items: { href: string; icon: React.ElementType; label: string; plan: Plan }[];
}[] = [
  {
    category: 'Menu',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', plan: 'free' },
      { href: '/content-calendar', icon: Calendar, label: 'Calendário', plan: 'pro' },
    ],
  },
  {
    category: 'Ferramentas',
    items: [
      { href: '/generate-weekly-plan', icon: ClipboardList, label: 'Plano Semanal', plan: 'pro' },
      { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeos', plan: 'pro' },
      { href: '/video-review', icon: Video, label: 'Análise de Vídeo', plan: 'pro' },
      { href: '/media-kit', icon: Briefcase, label: 'Mídia Kit & Propostas', plan: 'premium' },
      { href: '/publis-assistant', icon: Newspaper, label: 'Ideias para Publis', plan: 'premium' },
    ],
  },
];

const adminMenuItems: {
  category: string;
  items: { href: string; icon: React.ElementType; label: string }[];
}[] = [
    {
        category: 'Admin',
        items: [
            { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/admin/users', icon: User, label: 'Usuários' },
            { href: '/admin/financial', icon: DollarSign, label: 'Financeiro' },
            { href: '/admin/usage', icon: Activity, label: 'Uso da IA' },
            { href: '/admin/tokens', icon: Coins, label: 'Uso de Tokens' },
        ]
    }
];


const hasAccess = (userPlan: Plan, itemPlan: Plan): boolean => {
    const planHierarchy: Record<Plan, number> = {
        free: 0,
        pro: 1,
        premium: 2
    };

    return planHierarchy[userPlan] >= planHierarchy[itemPlan];
}

export function AppSidebar({ isMobile = false, setIsMobileMenuOpen }: { isMobile?: boolean, setIsMobileMenuOpen?: (isOpen: boolean) => void }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();

  const handleSignOut = () => {
    auth.signOut();
    router.push('/login');
  };

  const handleLinkClick = () => {
    if (isMobile && setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };
  
  const userPlan = subscription?.plan || 'free';
  const isUserActive = subscription?.status === 'active';

  const getPlanName = () => {
    if (isSubscriptionLoading || isAdminLoading) return "Carregando...";
    if (isAdmin) return "Admin";
    if (!isUserActive && userPlan === 'free') return "Fazer Upgrade";
    if (userPlan === 'premium') return 'Premium';
    if (userPlan === 'pro') return 'Pro';
    return "Gratuito";
  }
  
  const getPlanIcon = () => {
    if (isAdmin) return <Shield className="h-5 w-5" />;
    if (isSubscriptionLoading || isAdminLoading) return <Skeleton className="h-5 w-5 rounded-full" />;
    if (isUserActive && (userPlan === 'pro' || userPlan === 'premium')) return <Sparkles className="h-5 w-5" />;
    return <Crown className="h-5 w-5" />;
  }
  
  const sidebarClass = isMobile 
    ? "h-full w-full flex flex-col" 
    : "h-screen w-64 flex-col fixed inset-y-0 left-0 z-50 bg-card border-r hidden md:flex";

  const currentMenuItems = isAdmin ? adminMenuItems : userMenuItems;

  return (
     <aside className={sidebarClass}>
      <div className="flex items-center gap-2 px-6 h-20 border-b">
         <Link
            href="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
        >
            <div className="bg-foreground text-background h-8 w-8 flex items-center justify-center rounded-full">
            <ArrowUpRight className="h-5 w-5" />
            </div>
            trendify
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4">
        {!isMobile && (
          <div className='relative'>
              <Link href={isAdmin ? "/admin" : "/subscribe"} onClick={handleLinkClick} className="block w-full text-left p-4 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-violet-600 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow">
                  <div className='flex items-center gap-3'>
                      {getPlanIcon()}
                      <div className='flex flex-col'>
                          {(isSubscriptionLoading || isAdminLoading) ? <Skeleton className="h-5 w-20" /> : <span className='font-semibold text-lg leading-tight'>{getPlanName()}</span>}
                          <span className='text-sm opacity-80'>{isAdmin ? "Painel de Controle" : "Gerenciar assinatura"}</span>
                      </div>
                  </div>
              </Link>
          </div>
        )}
        
        <div className={cn("flex flex-col gap-4", !isMobile && "mt-6")}>
          {currentMenuItems.map(group => (
            <div key={group.category} className='px-2'>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
                {group.category}
              </h3>
               <ul className="space-y-1">
                 {(group.items as any).map((item: any) => {
                   const isActive = pathname === item.href;
                   const canAccess = isAdmin || hasAccess(userPlan, item.plan || 'free');

                   const content = (
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors text-sm",
                        isActive 
                            ? "bg-primary/10 text-primary font-semibold" 
                            : canAccess 
                                ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                                : "text-muted-foreground cursor-not-allowed",
                        !canAccess && "relative"
                      )}>
                        <item.icon className={cn("h-5 w-5", isActive || !canAccess ? "text-primary" : "text-foreground/60")} />
                        <span>{item.label}</span>
                         {!isAdmin && !canAccess && item.plan !== 'free' && (
                           <Crown className="h-4 w-4 ml-auto text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                   );

                   return (
                     <li key={item.label}>
                       <Link href={isAdmin || canAccess ? item.href : '/subscribe'} onClick={handleLinkClick}>
                         {content}
                       </Link>
                     </li>
                   );
                 })}
               </ul>
            </div>
          ))}
        </div>
      </nav>
      
       <div className="mt-auto p-4 border-t">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className='w-full justify-start h-auto p-2 hover:bg-muted'>
                    {isUserLoading ? (
                        <div className="flex items-center gap-3 w-full">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.photoURL ?? undefined} alt="User avatar" />
                            <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="w-[120px] overflow-hidden text-left">
                                <p className="text-sm font-semibold truncate text-foreground">{user?.displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <MoreHorizontal className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile" onClick={handleLinkClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/profile/integrations" onClick={handleLinkClick}>
                        <Link2 className="mr-2 h-4 w-4" />
                        <span>Integrações</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={handleLinkClick}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 {isAdmin ? (
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Ir para App</span>
                    </DropdownMenuItem>
                 ) : (
                   <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Painel Admin</span>
                    </DropdownMenuItem>
                 )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className='text-red-500 focus:text-red-500 focus:bg-red-500/10'>
                     <LogOut className="mr-2 h-4 w-4" />
                     <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       </div>
    </aside>
  );
}
