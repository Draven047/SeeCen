import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Boxes, LayoutGrid, MessageSquareWarning, IndianRupee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: Boxes, label: 'Inventory', path: '/inventory' },
  { icon: LayoutGrid, label: 'Hub', path: '/dashboard' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/feedback' },
  { icon: IndianRupee, label: 'Finance', path: '/finance' },
];

export function SellerOSBottomNav() {
  const location = useLocation();
  const { role } = useAuth();

  const isActive = (path: string) => {
    if (path === '/orders') return location.pathname === '/orders' || location.pathname.startsWith('/orders/');
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex items-stretch justify-around h-[56px] pb-safe">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-foreground" />
              )}
              <item.icon
                className={cn(
                  'h-[22px] w-[22px] transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
                strokeWidth={active ? 2.2 : 1.75}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
