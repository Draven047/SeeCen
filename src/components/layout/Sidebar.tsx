import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Boxes,
  RotateCcw, Users, UserCog, BarChart3, DollarSign, Store,
  Link2, Settings, LogOut, ShoppingBag, ChevronLeft, Inbox, PackageCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

// ── Navigation structure matching the 14-module IA ──

const coreNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: Truck, label: 'Fulfillment', path: '/fulfillment' },
  { icon: PackageCheck, label: 'Shipping & Pickups', path: '/shipping' },
];

const catalogNav: NavItem[] = [
  { icon: Package, label: 'Catalog', path: '/catalogue' },
  { icon: Boxes, label: 'Inventory', path: '/inventory' },
];

const serviceNav: NavItem[] = [
  { icon: RotateCcw, label: 'Returns & Exchanges', path: '/returns' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: UserCog, label: 'Employees', path: '/employees' },
];

const insightsNav: NavItem[] = [
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: DollarSign, label: 'Finance', path: '/finance' },
];

const adminNav: NavItem[] = [
  { icon: Store, label: 'Stores', path: '/admin' },
  { icon: Link2, label: 'Channels', path: '/channels' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

// ── Role access matrix ──
const roleAccess: Record<string, string[]> = {
  admin:      ['*'], // all
  manager:    ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns', '/customers', '/employees', '/analytics', '/finance'],
  sales:      ['/dashboard', '/orders', '/fulfillment', '/catalogue', '/customers', '/returns'],
  operations: ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns'],
  finance:    ['/dashboard', '/orders', '/analytics', '/finance'],
  viewer:     ['/dashboard', '/analytics'],
};

function canAccess(role: string | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(path);
}

export function Sidebar() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const { collapsed, toggle } = useSidebar();

  const isActive = (path: string) => {
    if (path === '/orders') return location.pathname === '/orders';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderSection = (label: string, items: NavItem[]) => {
    const visible = items.filter(i => canAccess(role, i.path));
    if (visible.length === 0) return null;
    return (
      <>
        <div className="pt-4 pb-1">
          {!collapsed && <p className="sidebar-section-label">{label}</p>}
        </div>
        {visible.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'sidebar-item',
              isActive(item.path) && 'sidebar-item-active',
              collapsed && 'justify-center px-3',
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </>
    );
  };

  // Core items shown without a section header
  const coreVisible = coreNav.filter(i => canAccess(role, i.path));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-bold text-foreground">Clozzet</h1>
              <p className="text-xs text-sidebar-muted truncate">SellerOS</p>
            </div>
          )}
          <button
            onClick={toggle}
            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Store Switcher */}
      <div className="px-3 pt-3">
        <StoreSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {coreVisible.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'sidebar-item',
              isActive(item.path) && 'sidebar-item-active',
              collapsed && 'justify-center px-3',
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {renderSection('Catalog', catalogNav)}
        {renderSection('Service', serviceNav)}
        {renderSection('Insights', insightsNav)}
        {renderSection('Administration', adminNav)}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className={cn(
            'sidebar-item w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-3',
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
