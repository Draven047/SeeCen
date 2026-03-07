import { NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Package, Boxes, Truck, PackageCheck, RotateCcw,
  Users, UserCog, BarChart3, IndianRupee, Store, Link2, Settings,
  LogOut, Bot, TrendingUp, Palette, UserCheck, LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';

interface NavGroup {
  label: string;
  items: { icon: React.ElementType; label: string; path: string }[];
}

const menuGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutGrid, label: 'Hub', path: '/dashboard' },
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Boxes, label: 'Inventory', path: '/inventory' },
      { icon: IndianRupee, label: 'Finance', path: '/finance' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Package, label: 'Catalogue', path: '/catalogue' },
      { icon: Truck, label: 'Fulfillment', path: '/fulfillment' },
      { icon: PackageCheck, label: 'Shipping', path: '/shipping' },
      { icon: RotateCcw, label: 'Returns', path: '/returns' },
    ],
  },
  {
    label: 'Growth & Insights',
    items: [
      { icon: TrendingUp, label: 'Growth', path: '/growth' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: Bot, label: 'AI Coach', path: '/ai-coach' },
    ],
  },
  {
    label: 'People',
    items: [
      { icon: Users, label: 'Customers', path: '/customers' },
      { icon: UserCog, label: 'Employees', path: '/employees' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { icon: Store, label: 'Stores', path: '/admin' },
      { icon: UserCheck, label: 'Approvals', path: '/admin/approvals' },
      { icon: Link2, label: 'Channels', path: '/channels' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

const roleAccess: Record<string, string[]> = {
  admin: ['*'],
  manager: ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns', '/customers', '/employees', '/analytics', '/finance', '/ai-coach', '/admin/approvals', '/feedback', '/growth'],
  sales: ['/dashboard', '/orders', '/fulfillment', '/catalogue', '/customers', '/returns', '/ai-coach', '/sales-coach', '/feedback', '/growth'],
  operations: ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns', '/feedback'],
  finance: ['/dashboard', '/orders', '/analytics', '/finance'],
  viewer: ['/dashboard', '/analytics'],
};

function canAccess(role: string | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(path);
}

export function SellerOSMoreMenu({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const { role, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/orders') return location.pathname === '/orders';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <StoreSwitcher collapsed={false} />
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {menuGroups.map((group) => {
          const visible = group.items.filter(i => canAccess(role, i.path));
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="px-2 mb-1">
              <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {visible.map((navItem) => (
                <NavLink
                  key={navItem.path}
                  to={navItem.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                    'text-foreground/70 hover:text-foreground hover:bg-muted/50',
                    isActive(navItem.path) && 'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
                  )}
                >
                  <navItem.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span>{navItem.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-2">
        <button
          onClick={() => { onClose(); signOut(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
