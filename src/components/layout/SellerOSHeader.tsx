import { useStore } from '@/contexts/StoreContext';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NotificationsDropdown } from './NotificationsDropdown';
import { DemoModeControl } from './DemoModeControl';
import { CommandPalette } from './CommandPalette';
import { brand } from '@/config/brand';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu, ShoppingBag } from 'lucide-react';
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
  '/ndr': 'NDR',
  '/fulfillment': 'Fulfillment',
  '/returns': 'Returns',
};

export function SellerOSHeader() {
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
    window.addEventListener('seecen-pending-orders', handler);
    return () => window.removeEventListener('seecen-pending-orders', handler);
  }, []);

  const pagePath = location.pathname.replace(/^\/demo/, '') || '/dashboard';
  const pageTitle = pageTitles[pagePath] || '';

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between bg-[#f6f7f3]/90 px-3 backdrop-blur-xl md:px-6">
      {/* Left: Store info */}
      <div className="flex items-center gap-2 min-w-0">
        {isMobile ? (
          <button
            type="button"
            onClick={() => setStoreStatusOpen(true)}
            aria-label="Open store status"
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-black/[0.04] bg-white px-3 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)]"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isOnline ? 'bg-[#563ed5]' : 'bg-[#9aa0a8]'
              )} />
              <span className="max-w-[140px] truncate text-sm font-bold text-[#17191c]">
                {currentStore?.name || brand.name}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStoreStatusOpen(true)}
              aria-label="Open store status"
              className="flex min-h-[48px] items-center gap-2 rounded-full border border-black/[0.04] bg-white px-4 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)] transition-transform hover:scale-[1.01]"
            >
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isOnline ? 'bg-[#563ed5]' : 'bg-[#9aa0a8]'
              )} />
              <span className="text-sm font-bold text-[#17191c]">
                {currentStore?.name || brand.name}
              </span>
              <span className={cn(
                'rounded-full px-2 py-1 text-[10px] font-bold',
                isOnline
                  ? 'bg-[#563ed5] text-white'
                  : 'bg-[#f0f2f0] text-[#777e87]'
              )}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </button>
            {pageTitle && (
              <span className="text-sm font-bold text-[#a1a7b0]">
                / {pageTitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Pending orders badge */}
        {pendingOrders > 0 && (
          <div className="relative flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-white text-[#17191c] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)]">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#563ed5] text-[10px] font-bold text-white">
              {pendingOrders}
            </span>
          </div>
        )}
        <CommandPalette />
        <DemoModeControl />
        <NotificationsDropdown />

        {/* More menu — mobile only */}
        {isMobile && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button type="button" aria-label="Open more navigation" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17191c] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)]">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="max-h-[520px] w-[280px] p-0">
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
