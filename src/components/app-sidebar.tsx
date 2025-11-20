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
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAuth } from 'firebase/auth';

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
import { useUser } from '@/firebase';

const navItems = [
  { href: '/dashboard', icon: LineChart, label: 'Painel' },
  { href: '/content-calendar', icon: Calendar, label: 'Calendário' },
  { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeo' },
  { href: '/video-review', icon: Video, label: 'Análise de Vídeo' },
  { href: '/publis-assistant', icon: Briefcase, label: 'Assistente Publis' },
  { href: '/media-kit', icon: Newspaper, label: 'Kit de Mídia' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = getAuth();

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="bg-sidebar border-r border-sidebar-border"
    >
      <SidebarHeader className="flex items-center justify-center p-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-headline font-bold text-xl"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black">
            T
          </span>
          <span className="hidden group-data-[state=expanded]:inline">
            trendify
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="h-10 justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="#">
              <SidebarMenuButton tooltip="Configurações" className="h-10 justify-start">
                <Settings className="h-5 w-5" />
                <span className="text-sm font-medium">Configurações</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sair" className="h-10 justify-start">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
         <div className="flex items-center justify-between p-2 mt-auto">
            <Link href="#" className='w-full'>
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
              className="flex group-data-[state=expanded]:hidden h-8 w-8"
            >
              <PanelLeft />
            </SidebarTrigger>
          </div>
      </SidebarFooter>
    </Sidebar>
  );
}
