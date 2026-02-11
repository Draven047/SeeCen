import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Boxes,
  RotateCcw, Users, UserCog, BarChart3, DollarSign, Store,
  Link2, Settings, LogOut, ShoppingBag, ChevronLeft, PackageCheck,
  Palette, ChevronDown, Bot,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Truck, label: 'Fulfillment', path: '/fulfillment' },
      { icon: PackageCheck, label: 'Shipping', path: '/shipping' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { icon: Package, label: 'Products', path: '/catalogue' },
      { icon: Boxes, label: 'Inventory', path: '/inventory' },
    ],
  },
  {
    label: 'Service',
    items: [
      { icon: RotateCcw, label: 'Returns', path: '/returns' },
      { icon: Users, label: 'Customers', path: '/customers' },
      { icon: UserCog, label: 'Employees', path: '/employees' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: DollarSign, label: 'Finance', path: '/finance' },
      { icon: Bot, label: 'AI Coach', path: '/ai-coach' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { icon: Store, label: 'Stores', path: '/admin' },
      { icon: Link2, label: 'Channels', path: '/channels' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: Palette, label: 'UI Kit', path: '/ui-kit' },
    ],
  },
];

const roleAccess: Record<string, string[]> = {
  admin:      ['*'],
  manager:    ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns', '/customers', '/employees', '/analytics', '/finance', '/ai-coach'],
  sales:      ['/dashboard', '/orders', '/fulfillment', '/catalogue', '/customers', '/returns', '/ai-coach', '/sales-coach'],
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => {
    if (path === '/orders') return location.pathname === '/orders';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.path);
    const link = (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent',
          active && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary-foreground' : 'text-sidebar-muted')} strokeWidth={1.75} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 z-50',
        collapsed ? 'w-[60px]' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-sidebar-border', collapsed ? 'justify-center h-14 px-2' : 'h-14 px-4')}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-none">Clozzet</h1>
                <p className="text-[10px] text-sidebar-muted mt-0.5">SellerOS</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className="flex h-6 w-6 items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Store Switcher */}
      <div className={cn('border-b border-sidebar-border', collapsed ? 'px-1.5 py-2' : 'px-3 py-2')}>
        <StoreSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 space-y-0.5">
        {navGroups.map((group) => {
          const visible = group.items.filter(i => canAccess(role, i.path));
          if (visible.length === 0) return null;

          const hasGroupLabel = group.label !== '';
          const isGroupCollapsed = collapsedGroups[group.label];
          const groupHasActive = visible.some(i => isActive(i.path));

          return (
            <div key={group.label || 'home'} className={cn(collapsed ? 'px-1.5' : 'px-2')}>
              {hasGroupLabel && !collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-2 pt-4 pb-1"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">{group.label}</span>
                  <ChevronDown className={cn(
                    'h-3 w-3 text-sidebar-muted transition-transform',
                    isGroupCollapsed && '-rotate-90',
                  )} />
                </button>
              )}
              {hasGroupLabel && collapsed && <div className="my-2 mx-1 h-px bg-sidebar-border" />}
              {(!isGroupCollapsed || collapsed) && (
                <div className="space-y-0.5">
                  {visible.map(renderNavItem)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className={cn('border-t border-sidebar-border', collapsed ? 'p-1.5' : 'p-2')}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="flex w-full items-center justify-center rounded-md px-2 py-2 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
