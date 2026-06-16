import { NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Boxes, LayoutGrid, MessageSquareWarning, IndianRupee,
  TrendingUp, Link2, UserCog, Store, Settings, LogOut, ShoppingBag,
  ChevronLeft, BarChart3, Bot, UserCheck, Package, Truck, Users,
  RotateCcw, PackageCheck, Palette,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const primaryNav: NavItem[] = [
  { icon: ShoppingCart, label: 'Orders', path: '/demo/orders' },
  { icon: Boxes, label: 'Inventory', path: '/demo/inventory' },
  { icon: LayoutGrid, label: 'Hub', path: '/demo/dashboard' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/demo/feedback' },
  { icon: IndianRupee, label: 'Finance', path: '/demo/finance' },
];

const secondaryGroups: NavGroup[] = [
  {
    label: 'More',
    items: [
      { icon: TrendingUp, label: 'Growth', path: '/demo/growth' },
      { icon: Package, label: 'Catalogue', path: '/demo/catalogue' },
      { icon: Truck, label: 'Fulfillment', path: '/demo/fulfillment' },
      { icon: PackageCheck, label: 'Shipping', path: '/demo/shipping' },
      { icon: RotateCcw, label: 'Returns', path: '/demo/returns' },
      { icon: Users, label: 'Customers', path: '/demo/customers' },
      { icon: UserCog, label: 'Employees', path: '/demo/employees' },
      { icon: BarChart3, label: 'Analytics', path: '/demo/analytics' },
      { icon: Bot, label: 'AI Coach', path: '/demo/ai-coach' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { icon: Store, label: 'Stores', path: '/demo/admin' },
      { icon: UserCheck, label: 'Approvals', path: '/demo/admin/approvals' },
      { icon: Link2, label: 'Channels', path: '/demo/channels' },
      { icon: Settings, label: 'Settings', path: '/demo/settings' },
    ],
  },
];

const roleAccess: Record<string, string[]> = {
  admin: ['*'],
  manager: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/shipping', '/demo/catalogue', '/demo/inventory', '/demo/returns', '/demo/customers', '/demo/employees', '/demo/analytics', '/demo/finance', '/demo/ai-coach', '/demo/admin/approvals', '/demo/feedback', '/demo/growth'],
  sales: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/catalogue', '/demo/customers', '/demo/returns', '/demo/ai-coach', '/demo/feedback', '/demo/growth'],
  operations: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/shipping', '/demo/catalogue', '/demo/inventory', '/demo/returns', '/demo/feedback'],
  finance: ['/demo/dashboard', '/demo/orders', '/demo/analytics', '/demo/finance'],
  viewer: ['/demo/dashboard', '/demo/analytics'],
};

function canAccess(role: string | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(path);
}

export function SellerOSSidebar() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== 'admin') return;
    const fetch = async () => {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      setPendingCount(count || 0);
    };
    fetch();
  }, [role]);

  const isActive = (path: string) => {
    if (path === '/demo/orders') return location.pathname === '/demo/orders' || location.pathname.startsWith('/demo/orders/');
    if (path === '/demo/dashboard') return location.pathname === '/demo/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderItem = (item: NavItem) => {
    const active = isActive(item.path);
    const showBadge = item.path === '/demo/admin/approvals' && pendingCount > 0;

    const link = (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[40px]',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-muted/50',
          active && 'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          collapsed && 'justify-center px-2',
        )}
      >
        <item.icon className={cn('h-[18px] w-[18px] shrink-0')} strokeWidth={active ? 2.2 : 1.75} />
        {!collapsed && (
          <span className="flex-1 flex items-center justify-between">
            <span>{item.label}</span>
            {showBadge && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild><div className="relative">{link}</div></TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-200 z-50',
      collapsed ? 'w-[60px]' : 'w-56',
    )}>
      {/* Logo */}
      <div className={cn('flex items-center border-b border-border', collapsed ? 'justify-center h-14 px-2' : 'h-14 px-4')}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <ShoppingBag className="h-4 w-4 text-background" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <ShoppingBag className="h-4 w-4 text-background" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-none">SeeCen</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">Open demo</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Store Switcher */}
      <div className={cn('border-b border-border', collapsed ? 'px-1.5 py-2' : 'px-3 py-2')}>
        <StoreSwitcher collapsed={collapsed} />
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 space-y-0.5">
        <div className={cn(collapsed ? 'px-1.5' : 'px-2')}>
          <div className="space-y-0.5">
            {primaryNav.filter(i => canAccess(role, i.path)).map(renderItem)}
          </div>
        </div>

        {/* Secondary */}
        {secondaryGroups.map((group) => {
          const visible = group.items.filter(i => canAccess(role, i.path));
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className={cn(collapsed ? 'px-1.5' : 'px-2')}>
              {!collapsed && (
                <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="my-2 mx-1 h-px bg-border" />}
              <div className="space-y-0.5">
                {visible.map(renderItem)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className={cn('border-t border-border', collapsed ? 'p-1.5' : 'p-2')}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={signOut} className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
