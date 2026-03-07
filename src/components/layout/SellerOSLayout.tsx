import { ReactNode } from 'react';
import { SellerOSSidebar } from './SellerOSSidebar';
import { SellerOSHeader } from './SellerOSHeader';
import { SellerOSBottomNav } from './SellerOSBottomNav';
import { WarningBannerSystem } from './WarningBannerSystem';
import { PageTransition } from './PageTransition';
import { IncomingOrderAlert } from '@/components/orders/IncomingOrderAlert';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function SellerOSContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <SellerOSSidebar />}

      <div className={cn(
        'min-h-screen flex flex-col transition-all duration-200',
        isMobile ? 'ml-0' : collapsed ? 'ml-[60px]' : 'ml-56'
      )}>
        <SellerOSHeader />
        <WarningBannerSystem />
        <main className={cn(
          'flex-1 overflow-auto',
          isMobile ? 'px-4 pt-3 pb-[72px]' : 'p-6'
        )}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <SellerOSBottomNav />}

      {/* Mock order popup for testing */}
      <MockOrderPopup />
    </div>
  );
}

export function SellerOSLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SellerOSContent>{children}</SellerOSContent>
    </SidebarProvider>
  );
}
