import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  dashboard: 'Home',
  orders: 'Orders',
  fulfillment: 'Fulfillment',
  shipping: 'Shipping',
  catalogue: 'Products',
  inventory: 'Inventory',
  returns: 'Returns',
  customers: 'Customers',
  employees: 'Employees',
  analytics: 'Analytics',
  finance: 'Finance',
  admin: 'Stores',
  channels: 'Channels',
  settings: 'Settings',
  'ai-coach': 'AI Coach',
  'sales-coach': 'Sales Coach',
  'ui-kit': 'UI Kit',
  operations: 'Operations',
  new: 'New',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[seg] || decodeURIComponent(seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link to="/demo/dashboard" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
