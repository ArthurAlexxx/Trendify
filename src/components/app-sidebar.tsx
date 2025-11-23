
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
  Sparkles,
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

const menuItems: {
  category: string;
  items: { href: string; icon: React.ElementType; label: string; plan: Plan }[];
}[] = [
  {
    category: 'Menu',
    items: [
      { href: '/dashboard', icon: LineChart, label: 'Acompanhamento', plan: 'free' },
      { href: '/generate-weekly-plan', icon: ClipboardList, label: 'Seu Plano', plan: 'pro' },
      { href: '/content-calendar', icon: Calendar, label: 'Calendário', plan: 'pro' },
    ],
  },
  {
    category: 'Ferramentas de IA',
    items: [
      { href: '/video-review', icon: Video, label: 'Análise de Vídeo', plan: 'pro' },
      { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeos', plan: 'pro' },
      { href: '/media-kit', icon: Briefcase, label: 'Mídia Kit & Propostas', plan: 'premium' },
      { href: '/publis-assistant', icon: Newspaper, label: 'Ideias para Publis', plan: 'premium' },
    ],
  },
];


const hasAccess = (userPlan: Plan, itemPlan: Plan): boolean => {
    if (itemPlan === 'free') return true;
    if (userPlan === 'premium') return true;
    if (userPlan === 'pro' && (itemPlan === 'pro' || itemPlan === 'free')) return true;
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

  const getPlanName = () => {
    if (!isUserActive) return "Upgrade";
    if (userPlan === 'premium') return 'Premium';
    if (userPlan === 'pro') return 'Pro';
    return "Upgrade";
  }
  
  const getPlanIcon = () => {
    if (isUserActive && (userPlan === 'pro' || userPlan === 'premium')) return <Sparkles className="h-5 w-5" />;
    return <Crown className="h-5 w-5" />;
  }

  return (
     <aside className="h-screen w-64 flex-col fixed inset-y-0 z-50 bg-card border-r hidden md:flex">
      <div className="flex items-center gap-2 px-6 h-20 border-b">
         <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
        >
            <div className="bg-foreground text-background h-8 w-8 flex items-center justify-center rounded-lg">
            <ArrowRight className="h-5 w-5" />
            </div>
            trendify
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4">
        <div className='relative'>
             <Link href="/subscribe" className="block w-full text-left p-4 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-violet-600 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow">
                <div className='flex items-center gap-3'>
                    {getPlanIcon()}
                    <div className='flex flex-col'>
                        <span className='font-semibold text-lg leading-tight'>{getPlanName()}</span>
                        <span className='text-sm opacity-80'>Gerenciar assinatura</span>
                    </div>
                </div>
            </Link>
        </div>
        
        <div className="flex flex-col gap-4 mt-6">
          {menuItems.map(group => (
            <div key={group.category} className='px-2'>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
                {group.category}
              </h3>
               <ul className="space-y-1">
                 {group.items.map(item => {
                   const isActive = pathname === item.href;
                   const canAccess = hasAccess(userPlan, item.plan);

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
                        <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-foreground/60")} />
                        <span>{item.label}</span>
                         {!canAccess && item.plan !== 'free' && (
                           <Crown className="h-4 w-4 ml-auto text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                   );

                   return (
                     <li key={item.label}>
                       <Link href={canAccess ? item.href : '/subscribe'}>
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
                    <div className="flex items-center gap-3 w-full">
                        <Avatar className="h-10 w-10 border-2 border-primary">
                          <AvatarImage src='https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80' alt="User avatar" />
                          <AvatarFallback>S</AvatarFallback>
                        </Avatar>
                        <div className="w-[120px] overflow-hidden text-left">
                            <p className="text-sm font-semibold truncate text-foreground">Sofia Alves</p>
                            <p className="text-xs text-muted-foreground truncate">
                                sofia.alves@demo.com
                            </p>
                        </div>
                         <LogOut className="h-4 w-4 ml-auto text-muted-foreground" />
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
       </div>
    </aside>
  );
}
