import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu, HelpCircle, ShoppingBag } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SellerOSMoreMenu } from './SellerOSMoreMenu';
import { StoreStatusDrawer } from './StoreStatusDrawer';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Hub',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/feedback': 'Feedback',
  '/finance': 'Finance',
  '/growth': 'Growth',
  '/catalogue': 'Catalogue',
  '/customers': 'Customers',
  '/employees': 'Employees',
  '/analytics': 'Analytics',
  '/channels': 'Channels',
  '/settings': 'Settings',
  '/admin': 'Admin',
  '/shipping': 'Shipping',
  '/fulfillment': 'Fulfillment',
  '/returns': 'Returns',
};

export function SellerOSHeader() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [storeStatusOpen, setStoreStatusOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);

  // Listen for pending order count from IncomingOrderAlert
  useEffect(() => {
    const handler = (e: Event) => {
      setPendingOrders((e as CustomEvent).detail as number);
    };
    window.addEventListener('clozzet-pending-orders', handler);
    return () => window.removeEventListener('clozzet-pending-orders', handler);
  }, []);

  const pageTitle = pageTitles[location.pathname] || '';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-4">
      {/* Left: Store info */}
      <div className="flex items-center gap-2 min-w-0">
        {isMobile ? (
          <button
            onClick={() => setStoreStatusOpen(true)}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isOnline ? 'bg-success' : 'bg-muted-foreground'
              )} />
              <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                {currentStore?.name || 'Clozzet'}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStoreStatusOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-muted/50 transition-colors"
            >
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isOnline ? 'bg-success' : 'bg-muted-foreground'
              )} />
              <span className="text-sm font-medium text-foreground">
                {currentStore?.name || 'Clozzet'}
              </span>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                isOnline
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              )}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </button>
            {pageTitle && (
              <span className="text-sm text-muted-foreground font-medium">
                / {pageTitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <NotificationsDropdown />
        
        {/* More menu — mobile only */}
        {isMobile && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted/50 transition-colors">
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SellerOSMoreMenu onClose={() => setMoreOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Store Status Drawer */}
      <StoreStatusDrawer
        open={storeStatusOpen}
        onOpenChange={setStoreStatusOpen}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
      />
    </header>
  );
}
