import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ShoppingCart, IndianRupee, TrendingUp, Users, BarChart3,
  RotateCcw, Settings, UserCog, MessageSquareWarning, Bot, Truck,
  ChevronRight, Boxes, ArrowUpRight,
  CheckCircle2, MoreHorizontal, ArrowRight,
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

interface RecentOrder {
  id: string;
  order_number: string | null;
  total: number | string | null;
  status: string | null;
  fulfillment_status: string | null;
  created_at: string | null;
  customer: { name: string | null } | { name: string | null }[] | null;
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
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<TodayStats>({ totalSales: 0, totalOrders: 0, liveOrders: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentStore) {
        setRecentOrders([]);
        setStats({ totalSales: 0, totalOrders: 0, liveOrders: 0, avgOrderValue: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      const today = new Date().toISOString().split('T')[0];

      try {
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

        if (ordersRes.error) throw ordersRes.error;
        if (recentRes.error) throw recentRes.error;

        const orders = ordersRes.data || [];
        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const liveOrders = orders.filter(order =>
          !['delivered', 'fulfilled', 'cancelled', 'declined'].includes(order.fulfillment_status || '')
        ).length;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        setStats({ totalSales, totalOrders, liveOrders, avgOrderValue });
        setRecentOrders((recentRes.data || []) as RecentOrder[]);
      } catch (error) {
        console.error('Failed to load Hub stats', error);
        setLoadError('Could not load live store data. Check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [currentStore]);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ─── MOBILE ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <SellerOSLayout>
        <div className="animate-fade-in pb-6">
          {/* Greeting + date */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{getGreeting()}</h1>
            <p className="text-sm text-muted-foreground mt-1">{currentStore?.name || 'All stores'} · {dateStr}</p>
          </div>

          {/* Hero — single prominent sales number */}
          <div className="mb-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Today's revenue</p>
            <p className="text-4xl font-bold text-foreground tracking-tight leading-none">
              {loading ? '—' : `₹${stats.totalSales.toLocaleString('en-IN')}`}
            </p>
          </div>

          {/* Secondary stats — inline, no cards */}
          <div className="flex items-center gap-6 mb-8 text-sm">
            <div>
              <span className="font-semibold text-foreground">{loading ? '—' : stats.totalOrders}</span>
              <span className="text-muted-foreground ml-1.5">orders</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className={cn("font-semibold", stats.liveOrders > 0 ? "text-warning" : "text-foreground")}>
                {loading ? '—' : stats.liveOrders}
              </span>
              <span className="text-muted-foreground ml-1.5">live</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className="font-semibold text-foreground">
                {loading ? '—' : `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`}
              </span>
              <span className="text-muted-foreground ml-1.5">avg</span>
            </div>
          </div>

          {/* Quick actions — compact pills */}
          <div className="flex gap-2 flex-wrap mb-10">
            {primaryActions.map(a => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card hover:bg-muted/50 active:scale-[0.97] transition-all"
              >
                <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </button>
            ))}
            <MoreActionsPopover navigate={navigate} />
          </div>

          {/* Recent orders */}
          <div className="mb-10">
            <RecentOrdersSection
              currentStoreName={currentStore?.name}
              loadError={loadError}
              orders={recentOrders}
              navigate={navigate}
            />
          </div>

          {/* Insights */}
          <InsightsSection navigate={navigate} />
        </div>
      </SellerOSLayout>
    );
  }

  // ─── DESKTOP ──────────────────────────────────────────────
  return (
    <SellerOSLayout>
      <div className="animate-fade-in max-w-[1080px]">

        {/* ── SECTION 1: Hero ──────────────────────────────── */}
        <div className="mb-12">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{getGreeting()}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentStore?.name || 'All stores'} · {dateStr}
            </p>
          </div>

          {/* Stats — single visual group, not separate cards */}
          <div className="flex items-end gap-12">
            {/* Primary metric */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5">
                Today's revenue
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl font-bold text-foreground tracking-tight leading-none">
                  {loading ? '—' : `₹${stats.totalSales.toLocaleString('en-IN')}`}
                </p>
                {!loading && stats.totalOrders > 0 && (
                  <span className="text-xs font-medium text-success flex items-center gap-0.5 mb-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.totalOrders} orders
                  </span>
                )}
              </div>
            </div>

            {/* Supporting metrics — text only, no boxes */}
            <div className="flex items-center gap-8 pb-1.5">
              <MetricInline label="Orders" value={loading ? '—' : stats.totalOrders.toString()} />
              <div className="w-px h-5 bg-border" />
              <MetricInline
                label="Live"
                value={loading ? '—' : stats.liveOrders.toString()}
                highlight={stats.liveOrders > 0}
              />
              <div className="w-px h-5 bg-border" />
              <MetricInline
                label="Avg order"
                value={loading ? '—' : `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Quick Actions ─────────────────────── */}
        <div className="flex items-center gap-2.5 mb-12">
          {primaryActions.map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all group"
            >
              <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-foreground">{a.label}</span>
            </button>
          ))}
          <MoreActionsPopover navigate={navigate} />
        </div>

        {/* ── SECTION 3: Main content ──────────────────────── */}
        <div className="grid grid-cols-12 gap-10">

          {/* Left — Recent Orders (dominant) */}
          <div className="col-span-7">
            <RecentOrdersSection
              currentStoreName={currentStore?.name}
              loadError={loadError}
              orders={recentOrders}
              navigate={navigate}
            />
          </div>

          {/* Right — Insights + Health (supportive) */}
          <div className="col-span-5">
            <InsightsSection navigate={navigate} />
          </div>
        </div>
      </div>
    </SellerOSLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function MetricInline({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn(
        'text-xl font-bold tracking-tight',
        highlight ? 'text-warning' : 'text-foreground'
      )}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function MoreActionsPopover({ navigate }: { navigate: (path: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border bg-card hover:bg-muted/40 transition-all text-sm font-medium text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        {moreActions.map(a => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <a.icon className="h-4 w-4 text-muted-foreground" />
            {a.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function getCustomerName(customer: RecentOrder['customer']) {
  if (Array.isArray(customer)) return customer[0]?.name || 'Walk-in';
  return customer?.name || 'Walk-in';
}

function RecentOrdersSection({
  currentStoreName,
  loadError,
  orders,
  navigate,
}: {
  currentStoreName?: string;
  loadError: string | null;
  orders: RecentOrder[];
  navigate: (path: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-foreground">Recent orders</h2>
        <button
          onClick={() => navigate('/orders')}
          className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-5 text-sm text-warning">
          {loadError}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
          <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {currentStoreName ? 'No recent orders yet' : 'Choose a store to see live orders'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {currentStoreName
              ? 'Create a demo order or wait for channel orders to land here.'
              : 'Once a store is active, today’s queue and revenue will stay in view.'}
          </p>
          {currentStoreName && (
            <button
              onClick={() => navigate('/orders/new')}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {orders.map((order) => {
            const customerName = getCustomerName(order.customer);
            const statusLabel = order.fulfillment_status?.replace('_', ' ') || 'new';
            const isDelivered = order.fulfillment_status === 'delivered';
            const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === 'new';
            const orderNumber = order.order_number || `#${order.id.slice(0, 8)}`;

            return (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex items-center w-full px-4 py-4 rounded-xl hover:bg-card transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-foreground font-mono tracking-tight">
                      {orderNumber}
                    </span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
                      isDelivered && 'bg-success/10 text-success',
                      isUnfulfilled && 'bg-warning/10 text-warning',
                      !isDelivered && !isUnfulfilled && 'bg-muted text-muted-foreground',
                    )}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{customerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    ₹{Number(order.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 ml-2 shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightsSection({ navigate }: { navigate: (path: string) => void }) {
  const storeHealth = [
    { label: 'Fulfilment rate', value: '96%' },
    { label: 'Avg pack time', value: '12 min' },
    { label: 'Return rate', value: '3.2%' },
  ];

  return (
    <div>
      {/* Insights */}
      <h2 className="text-base font-semibold text-foreground mb-5">Insights</h2>
      <div className="space-y-1 mb-10">
        {insightCards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className={cn(
              'flex items-center gap-4 w-full px-4 py-4 rounded-xl text-left group hover:bg-card transition-colors',
            )}
          >
            <div className={cn('w-1 h-8 rounded-full shrink-0', card.accent.replace('border-l-', 'bg-'))} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Store health — ultra-minimal */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Store health</h2>
        <div className="space-y-3.5">
          {storeHealth.map(m => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">{m.value}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-success/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
