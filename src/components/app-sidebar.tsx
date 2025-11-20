'use client';

import {
  Briefcase,
  Lightbulb,
  LineChart,
  Newspaper,
  PanelLeft,
  Video,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LineChart, label: 'Painel' },
  { href: '/video-ideas', icon: Lightbulb, label: 'Ideias de Vídeo' },
  { href: '/video-review', icon: Video, label: 'Análise de Vídeo' },
  { href: '/trend-radar', icon: 'trending', label: 'Radar de Tendências' },
  { href: '/publis-assistant', icon: Briefcase, label: 'Assistente Publis' },
  { href: '/media-kit', icon: Newspaper, label: 'Kit de Mídia' },
];

const TrendingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M2.5 2.5h3l4 4 4-4 4 4 4-4h3" />
    <path d="M2.5 7.5h3l4 4 4-4 4 4 4-4h3" />
    <path d="M2.5 12.5h3l4 4 4-4 4 4 4-4h3" />
    <path d="M2.5 17.5h3l4 4 4-4 4 4 4-4h3" />
  </svg>
);

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="bg-sidebar border-r border-sidebar-border"
    >
      <SidebarHeader className="flex items-center justify-between p-4">
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
        <SidebarTrigger
          variant="ghost"
          size="icon"
          className="hidden group-data-[state=expanded]:flex"
        >
          <PanelLeft />
        </SidebarTrigger>
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
                  {item.icon === 'trending' ? (
                    <TrendingIcon />
                  ) : (
                    <item.icon className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
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
            <Link href="#">
              <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent w-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="https://picsum.photos/seed/avatar/100/100"
                    alt="User Avatar"
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="hidden group-data-[state=expanded]:block w-full overflow-hidden">
                  <p className="text-sm font-semibold truncate">Jane Doe</p>
                  <p className="text-xs text-muted-foreground truncate">
                    jane.doe@example.com
                  </p>
                </div>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
