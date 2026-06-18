import { NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Boxes, LayoutGrid, MessageSquareWarning, IndianRupee,
  TrendingUp, Link2, UserCog, Store, Settings, ShoppingBag,
  ChevronLeft, BarChart3, Bot, UserCheck, Package, Truck, Users,
  RotateCcw, PackageCheck,
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
  manager: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/shipping', '/demo/catalogue', '/demo/inventory', '/demo/returns', '/demo/customers', '/demo/employees', '/demo/analytics', '/demo/ai-coach', '/demo/feedback', '/demo/growth'],
  sales: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/catalogue', '/demo/customers', '/demo/returns', '/demo/ai-coach', '/demo/feedback', '/demo/growth'],
  operations: ['/demo/dashboard', '/demo/orders', '/demo/fulfillment', '/demo/shipping', '/demo/catalogue', '/demo/inventory', '/demo/returns', '/demo/feedback'],
  finance: ['/demo/dashboard', '/demo/analytics', '/demo/finance'],
  viewer: ['/demo/dashboard'],
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
  const { role } = useAuth();
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
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex min-h-[48px] items-center rounded-[18px] text-sm font-bold transition-colors',
          active
            ? 'bg-[#563ed5] text-white shadow-[0_10px_26px_-18px_rgba(86,62,213,0.8)] hover:bg-[#563ed5] hover:text-white'
            : 'text-[#767d87] hover:bg-[#eef0f4] hover:text-[#17191c]',
          collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4',
        )}
      >
        <item.icon className="h-[20px] w-[20px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {showBadge && (
          <span className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
            collapsed ? 'absolute -right-1 -top-1 bg-[#17191c] text-white' : 'ml-auto bg-white/20 text-current'
          )}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </NavLink>
    );

    return (
      <Tooltip key={item.path} delayDuration={0}>
        <TooltipTrigger asChild><div className="relative">{link}</div></TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-black/[0.04] bg-white/95 backdrop-blur-xl transition-[width] duration-200',
      collapsed ? 'w-[76px]' : 'w-60',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex h-[76px] items-center border-b border-black/[0.04] px-3',
        collapsed ? 'justify-center' : 'justify-between gap-3'
      )}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggle}
                aria-label="Expand navigation"
                className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#17191c] text-white shadow-[0_14px_28px_-22px_rgba(0,0,0,0.9)] transition-colors hover:bg-[#2b2f35]"
              >
                <ShoppingBag className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#17191c] text-white shadow-[0_14px_28px_-22px_rgba(0,0,0,0.9)]">
              <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-black leading-5 tracking-[-0.03em] text-[#17191c]">SeeCen</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa0a8]">Seller OS</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse navigation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f2f5] text-[#7d848e] transition-colors hover:bg-[#e7e9ee] hover:text-[#17191c]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Store Switcher */}
      <div className={cn(
        'border-b border-black/[0.04]',
        collapsed ? 'px-2 py-3' : 'px-3 py-3'
      )}>
        <StoreSwitcher collapsed={collapsed} />
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div>
          <div className="space-y-2">
            {primaryNav.filter(i => canAccess(role, i.path)).map(renderItem)}
          </div>
        </div>

        {/* Secondary */}
        {secondaryGroups.map((group) => {
          const visible = group.items.filter(i => canAccess(role, i.path));
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="mx-auto my-3 h-px w-8 bg-black/[0.06]" />
              <div className="space-y-2">
                {visible.map(renderItem)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-black/[0.04] p-3" />
    </aside>
  );
}
