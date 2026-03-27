import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ShoppingCart, IndianRupee, TrendingUp, Package, Users, BarChart3,
  RotateCcw, Settings, UserCog, MessageSquareWarning, Bot, Truck,
  ChevronRight, Boxes, CircleDot, ArrowUpRight, Clock,
  CheckCircle2, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TodayStats {
  totalSales: number;
  totalOrders: number;
  liveOrders: number;
  avgOrderValue: number;
}

const primaryActions = [
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: Boxes, label: 'Inventory', path: '/inventory' },
  { icon: IndianRupee, label: 'Finance', path: '/finance' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/feedback' },
];

const moreActions = [
  { icon: RotateCcw, label: 'Returns', path: '/returns' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Truck, label: 'Shipping', path: '/shipping' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: UserCog, label: 'Staff', path: '/employees' },
  { icon: Bot, label: 'AI Coach', path: '/ai-coach' },
  { icon: TrendingUp, label: 'Growth', path: '/growth' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const insightCards = [
  { title: 'Sales Overview', desc: 'Revenue trends and performance', icon: TrendingUp, path: '/analytics', accent: 'border-l-primary' },
  { title: 'Order Funnel', desc: 'Conversion & fulfillment rates', icon: ShoppingCart, path: '/analytics', accent: 'border-l-warning' },
  { title: 'Inventory Health', desc: 'Stock levels & reorder alerts', icon: Boxes, path: '/inventory', accent: 'border-l-success' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<TodayStats>({ totalSales: 0, totalOrders: 0, liveOrders: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentStore) { setLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];

      const [ordersRes, recentRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total, fulfillment_status, status')
          .eq('store_id', currentStore.id)
          .gte('created_at', today),
        supabase
          .from('orders')
          .select('id, order_number, total, status, fulfillment_status, created_at, customer:customers(name)')
          .eq('store_id', currentStore.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const orders = ordersRes.data || [];
      const totalOrders = orders.length;
      const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
      const liveOrders = orders.filter(o =>
        !['delivered', 'fulfilled', 'cancelled', 'declined'].includes(o.fulfillment_status)
      ).length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      setStats({ totalSales, totalOrders, liveOrders, avgOrderValue });
      setRecentOrders(recentRes.data || []);
      setLoading(false);
    };
    fetchStats();
  }, [currentStore]);

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // ─── MOBILE ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <SellerOSLayout>
        <div className="space-y-6 animate-fade-in pb-4">
          {/* Greeting */}
          <div className="pt-1">
            <p className="text-lg font-semibold text-foreground">{getGreeting()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{currentStore?.name || 'All stores'} · {dateStr}</p>
          </div>

          {/* Hero stat */}
          <div className="rounded-2xl bg-primary/[0.06] p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's sales</p>
            <p className="text-3xl font-bold text-foreground mt-1 tracking-tight">
              {loading ? '—' : `₹${stats.totalSales.toLocaleString('en-IN')}`}
            </p>
          </div>

          {/* Supporting stats */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Orders" value={loading ? '—' : stats.totalOrders.toString()} />
            <MiniStat label="Live" value={loading ? '—' : stats.liveOrders.toString()} highlight={stats.liveOrders > 0} />
            <MiniStat label="AOV" value={loading ? '—' : `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`} />
          </div>

          {/* Quick actions — horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {primaryActions.map(a => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:bg-muted/50 active:scale-[0.97] transition-all shrink-0"
              >
                <a.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </button>
            ))}
            <MoreActionsPopover navigate={navigate} />
          </div>

          {/* Recent orders */}
          <RecentOrdersSection orders={recentOrders} navigate={navigate} />

          {/* Insights */}
          <InsightsSection navigate={navigate} />
        </div>
      </SellerOSLayout>
    );
  }

  // ─── DESKTOP ──────────────────────────────────────────────
  return (
    <SellerOSLayout>
      <div className="animate-fade-in space-y-8 max-w-[1120px]">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentStore?.name || 'All stores'} · {dateStr}
          </p>
        </div>

        {/* Hero stats row */}
        <div className="flex gap-4 items-stretch">
          {/* Primary stat — sales */}
          <div className="flex-1 min-w-0 rounded-2xl bg-primary/[0.05] p-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's sales</p>
            <div className="flex items-baseline gap-3 mt-1.5">
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {loading ? '—' : `₹${stats.totalSales.toLocaleString('en-IN')}`}
              </p>
              {!loading && stats.totalOrders > 0 && (
                <span className="text-xs font-medium text-success flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                  {stats.totalOrders} orders
                </span>
              )}
            </div>
          </div>

          {/* Supporting stats */}
          <div className="flex gap-3">
            <SupportingStat label="Orders" value={loading ? '—' : stats.totalOrders.toString()} />
            <SupportingStat label="Live" value={loading ? '—' : stats.liveOrders.toString()} highlight={stats.liveOrders > 0} />
            <SupportingStat label="AOV" value={loading ? '—' : `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {primaryActions.map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all"
            >
              <a.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{a.label}</span>
            </button>
          ))}
          <MoreActionsPopover navigate={navigate} />
        </div>

        {/* Main content — orders + insights */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <RecentOrdersSection orders={recentOrders} navigate={navigate} />
          </div>
          <div className="col-span-5">
            <InsightsSection navigate={navigate} />
          </div>
        </div>
      </div>
    </SellerOSLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-card p-3.5 text-center">
      <p className={cn('text-lg font-bold', highlight ? 'text-warning' : 'text-foreground')}>{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
    </div>
  );
}

function SupportingStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="w-[100px] rounded-xl bg-card/60 p-5 flex flex-col items-center justify-center text-center">
      <p className={cn('text-2xl font-bold tracking-tight', highlight ? 'text-warning' : 'text-foreground')}>{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
}

function MoreActionsPopover({ navigate }: { navigate: (path: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-card hover:bg-muted/40 transition-all text-sm font-medium text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1.5">
        {moreActions.map(a => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <a.icon className="h-4 w-4 text-muted-foreground" />
            {a.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function RecentOrdersSection({ orders, navigate }: { orders: any[]; navigate: (path: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
        <button onClick={() => navigate('/orders')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="rounded-2xl bg-card overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No orders yet today</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {orders.map((order) => {
              const customerName = (order.customer as any)?.name || 'Walk-in';
              const statusLabel = order.fulfillment_status?.replace('_', ' ') || 'new';
              const isDelivered = order.fulfillment_status === 'delivered';
              const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === 'new';

              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-mono">{order.order_number}</span>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
                        isDelivered && 'bg-success/10 text-success',
                        isUnfulfilled && 'bg-warning/10 text-warning',
                        !isDelivered && !isUnfulfilled && 'bg-muted text-muted-foreground',
                      )}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">₹{Number(order.total).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightsSection({ navigate }: { navigate: (path: string) => void }) {
  const storeHealth = [
    { label: 'Fulfilment rate', value: '96%', good: true },
    { label: 'Avg pack time', value: '12 min', good: true },
    { label: 'Return rate', value: '3.2%', good: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Insights</h2>
        <div className="space-y-2">
          {insightCards.map((card) => (
            <button
              key={card.title}
              onClick={() => navigate(card.path)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-l-[3px] hover:bg-muted/30 transition-all text-left group',
                card.accent
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* Store health — subtle */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Store health</h2>
        <div className="space-y-2.5">
          {storeHealth.map(m => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{m.value}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
