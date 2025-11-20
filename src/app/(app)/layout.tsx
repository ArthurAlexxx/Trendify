import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background w-full">
          <div className="p-4 sm:p-6 md:p-8 w-full">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
