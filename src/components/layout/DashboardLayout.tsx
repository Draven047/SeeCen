import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTransition } from './PageTransition';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { MobileBottomNav } from './MobileNav';
import { NewOrderFAB } from './NewOrderFAB';
import { useNewOrderShortcut } from '@/hooks/useNewOrderShortcut';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();

  useNewOrderShortcut();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      {!isMobile && <Sidebar />}

      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-200",
        isMobile ? "ml-0" : collapsed ? "ml-[60px]" : "ml-60"
      )}>
        <Header />
        <main className={cn(
          "flex-1 overflow-auto",
          isMobile ? "p-4 pb-24" : "p-6"
        )}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom nav + FAB */}
      {isMobile && <MobileBottomNav />}
      <NewOrderFAB />
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
