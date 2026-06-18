import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Boxes, LayoutGrid, MessageSquareWarning, IndianRupee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: ShoppingCart, label: 'Orders', path: '/demo/orders' },
  { icon: Boxes, label: 'Inventory', path: '/demo/inventory' },
  { icon: LayoutGrid, label: 'Hub', path: '/demo/dashboard' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/demo/feedback' },
  { icon: IndianRupee, label: 'Finance', path: '/demo/finance' },
];

const roleAccess: Record<string, string[]> = {
  admin: ['*'],
  manager: ['/demo/dashboard', '/demo/orders', '/demo/inventory', '/demo/feedback'],
  sales: ['/demo/dashboard', '/demo/orders', '/demo/feedback'],
  operations: ['/demo/dashboard', '/demo/orders', '/demo/inventory', '/demo/feedback'],
  finance: ['/demo/dashboard', '/demo/finance'],
  viewer: ['/demo/dashboard'],
};

function canAccess(role: string | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[role];
  if (!allowed) return false;
  return allowed.includes('*') || allowed.includes(path);
}

export function SellerOSBottomNav() {
  const location = useLocation();
  const { role } = useAuth();

  const isActive = (path: string) => {
    if (path === '/demo/orders') return location.pathname === '/demo/orders' || location.pathname.startsWith('/demo/orders/');
    if (path === '/demo/dashboard') return location.pathname === '/demo/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav aria-label="Primary mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.04] bg-white/95 shadow-[0_-18px_40px_-34px_rgba(15,23,42,0.55)] backdrop-blur-xl md:hidden">
      <div className="flex h-[64px] items-stretch justify-around px-2 pb-safe">
        {navItems.filter((item) => canAccess(role, item.path)).map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
            >
              {active && (
                <span className="absolute top-2 h-9 w-9 rounded-full bg-[#563ed5]" />
              )}
              <item.icon
                className={cn(
                  'relative h-[21px] w-[21px] transition-colors',
                  active ? 'text-white' : 'text-[#9aa0a8]'
                )}
                strokeWidth={active ? 2.2 : 1.75}
              />
              <span
                className={cn(
                  'relative text-[10px] font-bold transition-colors',
                  active ? 'text-[#563ed5]' : 'text-[#8f959d]'
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
