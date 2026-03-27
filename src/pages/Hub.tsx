import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
            <RecentOrdersSection orders={recentOrders} navigate={navigate} />
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
            <RecentOrdersSection orders={recentOrders} navigate={navigate} />
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

function RecentOrdersSection({ orders, navigate }: { orders: any[]; navigate: (path: string) => void }) {
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

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingCart className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders yet today</p>
        </div>
      ) : (
        <div className="space-y-1">
          {orders.map((order) => {
            const customerName = (order.customer as any)?.name || 'Walk-in';
            const statusLabel = order.fulfillment_status?.replace('_', ' ') || 'new';
            const isDelivered = order.fulfillment_status === 'delivered';
            const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === 'new';

            return (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex items-center w-full px-4 py-4 rounded-xl hover:bg-card transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-foreground font-mono tracking-tight">
                      {order.order_number}
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
                    ₹{Number(order.total).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
