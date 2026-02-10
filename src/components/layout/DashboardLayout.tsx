import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300",
        collapsed ? "ml-20" : "ml-64"
      )}>
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
