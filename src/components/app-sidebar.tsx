'use client';

import {
  Briefcase,
  Lightbulb,
  LineChart,
  Newspaper,
  PanelLeft,
  Video,
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
import { Button } from './ui/button';

const navItems = [
  { href: '/dashboard', icon: LineChart, label: 'Dashboard' },
  { href: '/video-ideas', icon: Lightbulb, label: 'AI Video Ideas' },
  { href: '/video-review', icon: Video, label: 'AI Video Review' },
  { href: '/trend-radar', icon: 'trending', label: 'Trend Radar' },
  { href: '/publis-assistant', icon: Briefcase, label: 'Publis Assistant' },
  { href: '/media-kit', icon: Newspaper, label: 'Media Kit' },
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-between p-2">
        <Link href="/" className="flex items-center gap-2 font-headline font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            T
          </span>
          <span className="hidden group-data-[state=expanded]:inline">Trendify</span>
        </Link>
        <SidebarTrigger variant="ghost" size="icon">
           <PanelLeft />
        </SidebarTrigger>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  {item.icon === 'trending' ? <TrendingIcon /> : <item.icon />}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Link href="#">
            <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8">
                    <AvatarImage src="https://picsum.photos/seed/avatar/100/100" alt="User Avatar" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="hidden group-data-[state=expanded]:block">
                    <p className="text-sm font-medium">Jane Doe</p>
                    <p className="text-xs text-muted-foreground">jane.doe@example.com</p>
                </div>
            </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
