import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Bot, Boxes, IndianRupee, LayoutGrid, Link2, MessageSquareWarning,
  Package, PackageCheck, Plus, RotateCcw, Search, Settings, ShoppingCart,
  TrendingUp, Truck, UserCog, Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/config/brand';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const navTargets = [
  { icon: LayoutGrid, label: 'Hub', path: '/demo/dashboard' },
  { icon: ShoppingCart, label: 'Orders', path: '/demo/orders' },
  { icon: Boxes, label: 'Inventory', path: '/demo/inventory' },
  { icon: IndianRupee, label: 'Finance', path: '/demo/finance' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/demo/feedback' },
  { icon: TrendingUp, label: 'Growth', path: '/demo/growth' },
  { icon: Package, label: 'Catalogue', path: '/demo/catalogue' },
  { icon: Truck, label: 'Fulfillment', path: '/demo/fulfillment' },
  { icon: PackageCheck, label: 'Shipping', path: '/demo/shipping' },
  { icon: RotateCcw, label: 'Returns', path: '/demo/returns' },
  { icon: Users, label: 'Customers', path: '/demo/customers' },
  { icon: UserCog, label: 'Employees', path: '/demo/employees' },
  { icon: BarChart3, label: 'Analytics', path: '/demo/analytics' },
  { icon: Bot, label: 'AI Coach', path: '/demo/ai-coach' },
  { icon: Link2, label: 'Channels', path: '/demo/channels' },
  { icon: Settings, label: 'Settings', path: '/demo/settings' },
];

interface LiveResults {
  orders: { id: string; order_number: string | null; total: number | null }[];
  customers: { id: string; name: string | null; phone: string | null }[];
  products: { id: string; name: string | null; sku: string | null }[];
}

const EMPTY_RESULTS: LiveResults = { orders: [], customers: [], products: [] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LiveResults>(EMPTY_RESULTS);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const q = query.trim();
    const timer = setTimeout(async () => {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, total').ilike('order_number', `%${q}%`).limit(4),
        supabase.from('customers').select('id, name, phone').ilike('name', `%${q}%`).limit(4),
        supabase.from('products').select('id, name, sku').ilike('name', `%${q}%`).limit(4),
      ]);
      setResults({
        orders: ordersRes.data || [],
        customers: customersRes.data || [],
        products: productsRes.data || [],
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search (Cmd+K)"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17191c] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)] transition-transform hover:scale-[1.04]"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
        <CommandInput
          placeholder="Search orders, customers, products, pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick actions">
            <CommandItem value="create new order" onSelect={() => go('/demo/orders/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create new order
            </CommandItem>
          </CommandGroup>

          {results.orders.length > 0 && (
            <CommandGroup heading="Orders">
              {results.orders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`order ${order.order_number || order.id}`}
                  onSelect={() => go(`/demo/orders/${order.id}`)}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="flex-1">{order.order_number || order.id}</span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(Number(order.total || 0))}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.customers.length > 0 && (
            <CommandGroup heading="Customers">
              {results.customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer ${customer.name || customer.id}`}
                  onSelect={() => go(`/demo/customers/${customer.id}`)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  <span className="flex-1">{customer.name}</span>
                  <span className="text-xs text-muted-foreground">{customer.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.products.length > 0 && (
            <CommandGroup heading="Products">
              {results.products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`product ${product.name || product.id}`}
                  onSelect={() => go(`/demo/catalogue/${product.id}`)}
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  <span className="flex-1">{product.name}</span>
                  <span className="text-xs text-muted-foreground">{product.sku}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Go to">
            {navTargets.map((target) => (
              <CommandItem
                key={target.path}
                value={`go to ${target.label}`}
                onSelect={() => go(target.path)}
                className="gap-2"
              >
                <target.icon className="h-4 w-4" />
                {target.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
