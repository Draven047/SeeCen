import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { StoreSwitcher } from './StoreSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: Package, label: 'Products', path: '/catalogue' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: BarChart3, label: 'More', path: '__menu__' },
];

interface NavGroup {
  label: string;
  items: { icon: React.ElementType; label: string; path: string }[];
}

const drawerNavGroups: NavGroup[] = [
  {
    label: 'Sales',
    items: [
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Package, label: 'Fulfillment', path: '/fulfillment' },
      { icon: Package, label: 'Shipping', path: '/shipping' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { icon: Package, label: 'Products', path: '/catalogue' },
      { icon: Package, label: 'Inventory', path: '/inventory' },
    ],
  },
  {
    label: 'Service',
    items: [
      { icon: Package, label: 'Returns', path: '/returns' },
      { icon: Users, label: 'Customers', path: '/customers' },
      { icon: Users, label: 'Employees', path: '/employees' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: BarChart3, label: 'Finance', path: '/finance' },
      { icon: BarChart3, label: 'AI Coach', path: '/ai-coach' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { icon: Package, label: 'Stores', path: '/admin' },
      { icon: Package, label: 'Channels', path: '/channels' },
      { icon: Package, label: 'Settings', path: '/settings' },
    ],
  },
];

const roleAccess: Record<string, string[]> = {
  admin: ['*'],
  manager: ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns', '/customers', '/employees', '/analytics', '/finance', '/ai-coach'],
  sales: ['/dashboard', '/orders', '/fulfillment', '/catalogue', '/customers', '/returns', '/ai-coach', '/sales-coach'],
  operations: ['/dashboard', '/orders', '/fulfillment', '/shipping', '/catalogue', '/inventory', '/returns'],
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

export function MobileBottomNav() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/orders') return location.pathname === '/orders';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm h-16 pb-safe md:hidden">
        {bottomNavItems.map((item) => {
          if (item.path === '__menu__') {
            return (
              <Sheet key="menu" open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] text-muted-foreground">
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-medium">More</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-border">
                      <StoreSwitcher collapsed={false} />
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                      {drawerNavGroups.map((group) => {
                        const visible = group.items.filter(i => canAccess(role, i.path));
                        if (visible.length === 0) return null;
                        return (
                          <div key={group.label} className="px-2 mb-2">
                            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                            {visible.map((navItem) => (
                              <NavLink
                                key={navItem.path}
                                to={navItem.path}
                                onClick={() => setDrawerOpen(false)}
                                className={cn(
                                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                                  'text-foreground/70 hover:text-foreground hover:bg-accent',
                                  isActive(navItem.path) && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
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
                        onClick={() => { setDrawerOpen(false); signOut(); }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
                      >
                        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          if (!canAccess(role, item.path)) return null;

          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
