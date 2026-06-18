import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bot, Boxes, CalendarDays,
  ChevronRight, Clock3, IndianRupee, MessageSquareWarning,
  MoreHorizontal, PackageCheck, RotateCcw, Settings, ShoppingCart, Sparkles,
  TrendingUp, Truck, Users, Zap,
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
  { icon: ShoppingCart, label: 'Orders', path: '/demo/orders' },
  { icon: Boxes, label: 'Inventory', path: '/demo/inventory' },
  { icon: IndianRupee, label: 'Finance', path: '/demo/finance' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/demo/feedback' },
];

const moreActions = [
  { icon: RotateCcw, label: 'Returns', path: '/demo/returns' },
  { icon: Users, label: 'Customers', path: '/demo/customers' },
  { icon: Truck, label: 'Shipping', path: '/demo/shipping' },
  { icon: BarChart3, label: 'Analytics', path: '/demo/analytics' },
  { icon: Bot, label: 'AI Coach', path: '/demo/ai-coach' },
  { icon: TrendingUp, label: 'Growth', path: '/demo/growth' },
  { icon: Settings, label: 'Settings', path: '/demo/settings' },
];

const activityBars = [28, 32, 37, 48, 66, 88, 72, 58, 41, 34, 31, 29, 26, 25, 30, 34, 37, 52, 66];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function Hub() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
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
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const pulseMetrics = useMemo(() => [
    { label: 'Orders', value: loading ? '—' : stats.totalOrders.toString(), helper: 'today', icon: ShoppingCart },
    { label: 'Live', value: loading ? '—' : stats.liveOrders.toString(), helper: 'needs action', icon: Activity, highlight: stats.liveOrders > 0 },
    { label: 'Avg order', value: loading ? '—' : formatCurrency(stats.avgOrderValue), helper: 'basket value', icon: IndianRupee },
  ], [loading, stats.avgOrderValue, stats.liveOrders, stats.totalOrders]);

  return (
    <SellerOSLayout>
      <div className="mx-auto w-full max-w-[1480px] animate-fade-in space-y-5 pb-8 text-[#191b1f] md:space-y-6">
        <section className="flex flex-col gap-5 rounded-[28px] border border-black/[0.04] bg-white px-4 py-5 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] md:flex-row md:items-end md:justify-between md:px-8 md:py-7">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#563ed5] text-white shadow-[0_0_26px_rgba(86,62,213,0.28)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1b1d21]">{getGreeting()}, {currentStore?.name || 'SeeCen'}</p>
                <p className="text-xs font-medium text-[#8b9098]">Seller command center · {dateStr}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#a7adb5]">Today's revenue</p>
                <h1 className="mt-1 text-[3.1rem] font-semibold leading-none tracking-[-0.04em] text-[#111315] sm:text-[4.6rem]">
                  {loading ? '—' : formatCurrency(stats.totalSales)}
                </h1>
              </div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#563ed5] px-3 py-1.5 text-xs font-bold text-white">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {loading ? 'Live sync' : `${stats.totalOrders} orders`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill icon={CalendarDays} label="This week" />
            <Pill icon={Clock3} label="24h" />
            <button
              type="button"
              onClick={() => navigate('/demo/orders/new')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#17191c] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.8)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#563ed5]"
            >
              New order
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(480px,1.65fr)_minmax(270px,0.9fr)]">
          <MetricStack loading={loading} stats={stats} />
          <ActivityPanel metrics={pulseMetrics} />
          <ProgressPanel navigate={navigate} stats={stats} loading={loading} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:grid-cols-[minmax(330px,0.75fr)_minmax(0,1.25fr)_minmax(290px,0.7fr)]">
          <GrowthCard navigate={navigate} />
          <RecentOrdersSection
            currentStoreName={currentStore?.name}
            loadError={loadError}
            orders={recentOrders}
            navigate={navigate}
          />
          <ActionsPanel navigate={navigate} />
        </section>
      </div>
    </SellerOSLayout>
  );
}

function Pill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/[0.05] bg-[#f7f8f5] px-4 text-sm font-semibold text-[#34373c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <Icon className="h-4 w-4 text-[#7f858d]" />
      {label}
    </span>
  );
}

function MetricStack({ loading, stats }: { loading: boolean; stats: TodayStats }) {
  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-[#fbfcf8] p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.6)]">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#563ed5]" title="Sales pulse" />
        <span className="rounded-full bg-[#17191c] px-2.5 py-1 text-[11px] font-semibold text-white">Now</span>
      </div>
      <div className="mt-9">
        <p className="text-5xl font-semibold leading-none tracking-[-0.05em] text-[#111315]">
          {loading ? '—' : formatCurrency(stats.totalSales)}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f959d]">Sales today</p>
      </div>
      <div className="mt-12 grid grid-cols-2 divide-x divide-black/[0.06] border-t border-black/[0.06] pt-5">
        <SmallMetric label="Orders" value={loading ? '—' : stats.totalOrders.toString()} />
        <SmallMetric label="Live queue" value={loading ? '—' : stats.liveOrders.toString()} align="right" />
      </div>
    </div>
  );
}

function ActivityPanel({ metrics }: { metrics: { label: string; value: string; helper: string; icon: React.ElementType; highlight?: boolean }[] }) {
  return (
    <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <PanelTitle dot="bg-[#563ed5]" title="Analytics" />
          <div className="mt-6 flex flex-wrap gap-6 md:gap-10">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-[88px]">
                <div className="flex items-center gap-2">
                  <metric.icon className={cn('h-4 w-4', metric.highlight ? 'text-[#17191c]' : 'text-[#9096a0]')} />
                  <p className="text-xs font-semibold text-[#777e87]">{metric.label}</p>
                </div>
                <p className="mt-1 text-4xl font-semibold leading-none tracking-[-0.05em] text-[#111315]">{metric.value}</p>
                <p className="mt-1 text-[11px] font-medium text-[#a1a7b0]">{metric.helper}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Expand analytics" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f5f2] text-[#17191c]">
            <Zap className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Analytics options" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f5f2] text-[#17191c]">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 flex h-[190px] items-end gap-2 overflow-hidden rounded-[24px] bg-[#fbfcf8] px-4 pb-5 pt-7 sm:gap-3">
        {activityBars.map((height, index) => {
          const active = index === 5 || index === 17;
          return (
            <div key={index} className="flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className={cn(
                  'w-full max-w-[26px] rounded-full transition-all',
                  active ? 'bg-[#563ed5] shadow-[0_0_24px_rgba(86,62,213,0.28)]' : 'bg-[#1d2024]'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {['Tracker', 'Sales', 'Inventory', 'Customers', 'AI Coach'].map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={cn(
              'min-h-8 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors',
              index === 0 ? 'bg-[#563ed5] text-white' : 'bg-[#f4f5f2] text-[#757b84] hover:text-[#17191c]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressPanel({ navigate, stats, loading }: { navigate: (path: string) => void; stats: TodayStats; loading: boolean }) {
  const progressRows = [
    { label: 'Packing', value: loading ? '—' : `${Math.max(stats.liveOrders, 1)} open`, active: true },
    { label: 'Shipping', value: '3 ready' },
    { label: 'Returns', value: '2 review' },
  ];

  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-[#f0f2f0] p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#563ed5]" title="Progress" />
        <button type="button" aria-label="Progress options" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#17191c]">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => navigate('/demo/fulfillment')}
        className="mt-6 flex w-full items-center gap-4 rounded-[24px] bg-white p-3 text-left transition-transform hover:scale-[1.01]"
      >
        <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-[20px] bg-[#563ed5] text-white">
          <PackageCheck className="h-9 w-9" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[#777e87]">Fulfilment</span>
          <span className="mt-1 block text-5xl font-semibold leading-none tracking-[-0.06em] text-[#111315]">
            {loading ? '—' : Math.max(87, 100 - stats.liveOrders * 3)}
          </span>
        </span>
      </button>
      <div className="mt-5 space-y-2">
        {progressRows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => navigate(row.label === 'Returns' ? '/demo/returns' : '/demo/orders')}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition-colors',
              row.active ? 'bg-white text-[#17191c]' : 'text-[#8b9098] hover:bg-white/70 hover:text-[#17191c]'
            )}
          >
            <span className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', row.active ? 'bg-[#17191c]' : 'bg-white')} />
              {row.label}
            </span>
            <span className={cn(row.active && 'rounded-full bg-[#563ed5] px-2 py-1 text-xs text-white')}>{row.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GrowthCard({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#563ed5]/25 blur-2xl" />
      <PanelTitle dot="bg-[#563ed5]" title="Exposure" />
      <h2 className="mt-8 max-w-[13rem] text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-[#17191c]">
        Monitor growth with precision
      </h2>
      <p className="mt-5 max-w-xs text-sm font-medium leading-6 text-[#838993]">
        Watch revenue, fulfilment, feedback, and channel momentum from one daily operating view.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/demo/growth')}
          className="rounded-full bg-[#17191c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Open growth
        </button>
        <button
          type="button"
          onClick={() => navigate('/demo/analytics')}
          className="inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-semibold text-[#777e87] hover:bg-[#f4f5f2] hover:text-[#17191c]"
        >
          Analytics
        </button>
      </div>
    </div>
  );
}

function ActionsPanel({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]">
        <PanelTitle dot="bg-[#563ed5]" title="Actions" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {primaryActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex min-h-[86px] flex-col justify-between rounded-[20px] border border-black/[0.04] bg-[#fbfcf8] p-3 text-left transition-transform hover:scale-[1.02]"
            >
              <action.icon className="h-5 w-5 text-[#17191c]" />
              <span className="text-sm font-bold text-[#17191c]">{action.label}</span>
            </button>
          ))}
        </div>
        <MoreActionsPopover navigate={navigate} />
      </div>
      <div className="rounded-[26px] bg-[#563ed5] p-5 text-white shadow-[0_18px_45px_-34px_rgba(86,62,213,0.45)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">AI suggestion</p>
          <Bot className="h-5 w-5" />
        </div>
        <p className="mt-6 text-4xl font-semibold leading-none tracking-[-0.05em]">10.57</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em]">Priority score</p>
      </div>
    </div>
  );
}

function MoreActionsPopover({ navigate }: { navigate: (path: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-[#f4f5f2] px-4 text-sm font-bold text-[#5e656f] transition-colors hover:text-[#17191c]"
        >
          <MoreHorizontal className="h-4 w-4" />
          More controls
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 rounded-3xl border-black/[0.06] bg-white p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]">
        {moreActions.map(a => (
          <button
            key={a.path}
            type="button"
            onClick={() => navigate(a.path)}
            className="flex min-h-[42px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-[#30343a] transition-colors hover:bg-[#f4f5f2]"
          >
            <a.icon className="h-4 w-4 text-[#7d838c]" />
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
    <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] md:p-6">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle dot="bg-[#563ed5]" title="Recent orders" />
        <button
          type="button"
          onClick={() => navigate('/demo/orders')}
          className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f2] px-3 py-2 text-xs font-bold text-[#737a83] transition-colors hover:text-[#17191c]"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {loadError ? (
        <div className="mt-5 rounded-[22px] border border-[#563ed5]/25 bg-[#563ed5]/10 px-4 py-5 text-sm font-semibold text-[#2f2377]">
          {loadError}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-black/[0.08] bg-[#fbfcf8] px-5 py-10 text-center">
          <ShoppingCart className="mx-auto mb-3 h-9 w-9 text-[#b7bdc5]" />
          <p className="text-sm font-bold text-[#17191c]">
            {currentStoreName ? 'No recent orders yet' : 'Choose a store to see live orders'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-[#8b9098]">
            {currentStoreName
              ? 'Create a demo order or wait for channel orders to land here.'
              : 'Once a store is active, today’s queue and revenue will stay in view.'}
          </p>
          {currentStoreName && (
            <button
              type="button"
              onClick={() => navigate('/demo/orders/new')}
              className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#17191c] px-5 text-xs font-bold text-white"
            >
              Create order
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {orders.map((order) => {
            const customerName = getCustomerName(order.customer);
            const statusLabel = order.fulfillment_status?.replace('_', ' ') || 'new';
            const isDelivered = order.fulfillment_status === 'delivered';
            const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === 'new';
            const orderNumber = order.order_number || `#${order.id.slice(0, 8)}`;

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate(`/demo/orders/${order.id}`)}
                className="group flex min-h-[74px] w-full items-center rounded-[22px] bg-[#fbfcf8] px-4 text-left transition-colors hover:bg-[#f4f5f2]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-tight text-[#17191c]">{orderNumber}</span>
                    <span className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold capitalize',
                      isDelivered && 'bg-emerald-100 text-emerald-700',
                      isUnfulfilled && 'bg-[#563ed5] text-white',
                      !isDelivered && !isUnfulfilled && 'bg-[#ecefeb] text-[#747b84]',
                    )}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#8c929a]">{customerName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-[#17191c]">
                    ₹{Number(order.total || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#9aa0a8]">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </p>
                </div>
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[#b7bdc5] transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelTitle({ dot, title }: { dot: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-4 w-4 rounded-[5px]', dot)} />
      <h2 className="text-sm font-bold text-[#17191c]">{title}</h2>
    </div>
  );
}

function SmallMetric({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={cn('px-1', align === 'right' && 'pl-5 text-right')}>
      <p className="text-4xl font-semibold leading-none tracking-[-0.05em] text-[#111315]">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8f959d]">{label}</p>
    </div>
  );
}
