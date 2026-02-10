import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, Package, Users, Clock, Warehouse, Settings, LogOut, Zap, ChevronLeft, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const mainNavItems = [{
  icon: LayoutDashboard,
  label: 'Dashboard',
  path: '/dashboard'
}, {
  icon: Plus,
  label: 'Create Order',
  path: '/orders/new'
}, {
  icon: Package,
  label: 'Cigar Catalogue',
  path: '/catalogue'
}, {
  icon: Users,
  label: 'Customer CRM',
  path: '/customers'
}, {
  icon: Clock,
  label: 'Order History',
  path: '/orders'
}, {
  icon: Brain,
  label: 'AI Sales Coach',
  path: '/ai-coach'
}];
const operationsItems = [{
  icon: Warehouse,
  label: 'Operations Panel',
  path: '/operations'
}];
const adminItems = [{
  icon: Settings,
  label: 'Admin Panel',
  path: '/admin'
}];
export function Sidebar() {
  const location = useLocation();
  const {
    role,
    signOut,
    user
  } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const isActive = (path: string) => {
    // Exact match for /orders to avoid matching /orders/new
    if (path === '/orders') {
      return location.pathname === '/orders';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  return <aside className={cn("fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50", collapsed ? "w-20" : "w-64")}>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-bold text-foreground">Cigartrax</h1>
              <p className="text-xs text-sidebar-muted truncate">Administration</p>
            </div>}
          <button onClick={toggle} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {mainNavItems.map(item => <NavLink key={item.path} to={item.path} className={cn("sidebar-item", isActive(item.path) && "sidebar-item-active", collapsed && "justify-center px-3")} title={collapsed ? item.label : undefined}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>)}

        {/* Operations Section */}
        {(role === 'admin' || role === 'operations') && <>
            <div className="pt-4 pb-2">
              {!collapsed && <p className="sidebar-section-label">Operations</p>}
            </div>
            {operationsItems.map(item => <NavLink key={item.path} to={item.path} className={cn("sidebar-item", isActive(item.path) && "sidebar-item-active", collapsed && "justify-center px-3")} title={collapsed ? item.label : undefined}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>)}
          </>}

        {/* Admin Section */}
        {role === 'admin' && <>
            <div className="pt-4 pb-2">
              {!collapsed && <p className="sidebar-section-label">Administration</p>}
            </div>
            {adminItems.map(item => <NavLink key={item.path} to={item.path} className={cn("sidebar-item", isActive(item.path) && "sidebar-item-active", collapsed && "justify-center px-3")} title={collapsed ? item.label : undefined}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>)}
          </>}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={signOut} className={cn("sidebar-item w-full text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center px-3")}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>;
}