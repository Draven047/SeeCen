import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { brand, formatCurrency } from '@/config/brand';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, BarChart3, Bot, Boxes,
  ChevronRight, IndianRupee, MessageSquareWarning, MoreHorizontal, PackageCheck,
  RotateCcw, Settings, ShoppingCart, Sparkles, Target, TrendingUp, Truck, Users, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const DAY = 24 * 60 * 60 * 1000;

type RangeKey = 'today' | '7d' | '30d';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

type ChartTab = 'revenue' | 'orders' | 'customers';

interface OrderRow {
  id: string;
  order_number: string | null;
  total: number | string | null;
  status: string | null;
  fulfillment_status: string | null;
  payment_type: string | null;
  channel: string | null;
  sla_deadline: string | null;
  created_at: string;
  shipped_at: string | null;
  customer?: { name: string | null } | { name: string | null }[] | null;
  order_items?: { product_id: string; quantity: number; total_price: number }[];
}

interface HubData {
  orders: OrderRow[];
  pendingReturns: number;
  lowStockCount: number;
  codPendingAmount: number;
  target: { target_amount: number; start_date: string } | null;
  aiSummary: string | null;
  productNames: Record<string, string>;
}

const CLOSED_STATUSES = ['delivered', 'fulfilled', 'cancelled', 'declined', 'returned', 'rto'];
const PRE_DISPATCH_STATUSES = ['new', 'unfulfilled', 'pending', 'accepted', 'picking', 'packed', 'ready'];

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function rangeWindow(range: RangeKey): { start: number; prevStart: number; prevEnd: number } {
  const now = Date.now();
  if (range === 'today') {
    const start = startOfToday();
    return { start, prevStart: start - DAY, prevEnd: start };
  }
  const days = range === '7d' ? 7 : 30;
  const start = now - days * DAY;
  return { start, prevStart: start - days * DAY, prevEnd: start };
}

function orderRevenue(order: OrderRow) {
  return order.fulfillment_status === 'cancelled' ? 0 : Number(order.total || 0);
}

export default function Hub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>('today');
  const [chartTab, setChartTab] = useState<ChartTab>('revenue');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<HubData>({
    orders: [], pendingReturns: 0, lowStockCount: 0, codPendingAmount: 0,
    target: null, aiSummary: null, productNames: {},
  });

  useEffect(() => {
    const fetchAll = async () => {
      if (!currentStore) { setLoading(false); return; }
      setLoading(true);
      setLoadError(null);
      const since = new Date(Date.now() - 62 * DAY).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      try {
        const [ordersRes, returnsRes, inventoryRes, codRes, targetRes, aiRes, productsRes] = await Promise.all([
          supabase
            .from('orders')
            .select('id, order_number, total, status, fulfillment_status, payment_type, channel, sla_deadline, created_at, shipped_at, customer:customers(name), order_items(product_id, quantity, total_price)')
            .eq('store_id', currentStore.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false }),
          supabase
            .from('return_requests')
            .select('id', { count: 'exact' })
            .eq('store_id', currentStore.id)
            .eq('status', 'pending'),
          supabase
            .from('store_inventory')
            .select('quantity, min_stock_level')
            .eq('store_id', currentStore.id),
          supabase
            .from('cod_reconciliation')
            .select('expected_amount, collected_amount, amount')
            .eq('store_id', currentStore.id)
            .eq('status', 'pending'),
          user
            ? supabase.from('sales_targets').select('target_amount, start_date').eq('user_id', user.id).limit(1)
            : Promise.resolve({ data: null, error: null }),
          user
            ? supabase.from('ai_coach_daily_recommendations').select('daily_summary').eq('user_id', user.id).eq('recommendation_date', today).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from('products').select('id, name'),
        ]);

        if (ordersRes.error) throw ordersRes.error;

        const lowStock = ((inventoryRes.data || []) as { quantity: number; min_stock_level: number | null }[]).filter(
          (row) => Number(row.quantity) <= Number(row.min_stock_level || 0)
        ).length;
        const codPending = ((codRes.data || []) as { expected_amount?: number; amount?: number; collected_amount?: number }[]).reduce(
          (sum, row) => sum + Math.max(0, Number(row.expected_amount ?? row.amount ?? 0) - Number(row.collected_amount || 0)),
          0
        );
        const productNames: Record<string, string> = {};
        ((productsRes.data || []) as { id: string; name: string }[]).forEach((p) => { productNames[p.id] = p.name; });

        setData({
          orders: (ordersRes.data || []) as OrderRow[],
          pendingReturns: returnsRes.count ?? (returnsRes.data || []).length,
          lowStockCount: lowStock,
          codPendingAmount: codPending,
          target: (targetRes.data && targetRes.data[0]) || null,
          aiSummary: aiRes.data?.daily_summary || null,
          productNames,
        });
      } catch (error) {
        console.error('Failed to load Hub data', error);
        setLoadError('Could not load live store data. Check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [currentStore, user]);

  const { start, prevStart, prevEnd } = rangeWindow(range);

  const metrics = useMemo(() => {
    const inRange = data.orders.filter((o) => new Date(o.created_at).getTime() >= start);
    const inPrev = data.orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= prevStart && t < prevEnd;
    });
    const revenue = inRange.reduce((s, o) => s + orderRevenue(o), 0);
    const prevRevenue = inPrev.reduce((s, o) => s + orderRevenue(o), 0);
    const orderCount = inRange.filter((o) => o.fulfillment_status !== 'cancelled').length;
    const prevOrderCount = inPrev.filter((o) => o.fulfillment_status !== 'cancelled').length;
    const liveQueue = data.orders.filter((o) => !CLOSED_STATUSES.includes(o.fulfillment_status || 'new')).length;
    const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
    const revenueDelta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
    return { inRange, revenue, prevRevenue, orderCount, prevOrderCount, liveQueue, avgOrder, revenueDelta };
  }, [data.orders, start, prevStart, prevEnd]);

  const actionItems = useMemo(() => {
    const now = Date.now();
    const overdueSla = data.orders.filter((o) =>
      PRE_DISPATCH_STATUSES.includes(o.fulfillment_status || '') &&
      o.sla_deadline && new Date(o.sla_deadline).getTime() < now
    ).length;
    const readyToShip = data.orders.filter((o) => o.fulfillment_status === 'packed').length;
    const failedDeliveries = data.orders.filter((o) => o.fulfillment_status === 'failed_delivery').length;
    const items = [
      { key: 'sla', icon: AlertTriangle, label: t('Orders past SLA'), count: overdueSla, path: '/demo/orders', urgent: true, detail: t('Dispatch these first') },
      { key: 'ndr', icon: AlertTriangle, label: t('Failed deliveries'), count: failedDeliveries, path: '/demo/ndr', urgent: true, detail: t('Reattempt or confirm with customer') },
      { key: 'ship', icon: Truck, label: t('Packed, ready to ship'), count: readyToShip, path: '/demo/shipping', urgent: false, detail: t('Book pickups') },
      { key: 'returns', icon: RotateCcw, label: t('Returns to review'), count: data.pendingReturns, path: '/demo/returns', urgent: false, detail: t('Approve or decline') },
      { key: 'stock', icon: Boxes, label: t('Low-stock SKUs'), count: data.lowStockCount, path: '/demo/inventory', urgent: false, detail: t('Replenish soon') },
      {
        key: 'cod', icon: IndianRupee, label: t('COD to reconcile'), count: data.codPendingAmount > 0 ? 1 : 0,
        displayValue: data.codPendingAmount > 0 ? formatCurrency(data.codPendingAmount) : undefined,
        path: '/demo/finance', urgent: false, detail: t('Match collections'),
      },
    ];
    return items.filter((i) => i.count > 0);
  }, [data, t]);

  const fulfilmentScore = useMemo(() => {
    const now = Date.now();
    const recent = data.orders.filter((o) => new Date(o.created_at).getTime() >= now - 30 * DAY);
    const shipped = recent.filter((o) => o.shipped_at);
    const onTime = shipped.filter((o) => !o.sla_deadline || new Date(o.shipped_at!).getTime() <= new Date(o.sla_deadline).getTime()).length;
    const overdueOpen = recent.filter((o) =>
      PRE_DISPATCH_STATUSES.includes(o.fulfillment_status || '') &&
      o.sla_deadline && new Date(o.sla_deadline).getTime() < now
    ).length;
    const denominator = shipped.length + overdueOpen;
    if (denominator === 0) return null;
    return Math.round((onTime / denominator) * 100);
  }, [data.orders]);

  const dateStr = new Date().toLocaleDateString(brand.locale, {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const rangeLabel = range === 'today' ? "Today's revenue" : range === '7d' ? 'Revenue · last 7 days' : 'Revenue · last 30 days';

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
                <p className="text-sm font-semibold text-[#1b1d21]">{t(getGreeting())}, {currentStore?.name || brand.name}</p>
                <p className="text-xs font-medium text-[#8b9098]">{t('Seller command center')} · {dateStr}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#a7adb5]">{t(rangeLabel)}</p>
                <h1 className="mt-1 text-[3.1rem] font-semibold leading-none tracking-[-0.04em] text-[#111315] sm:text-[4.6rem]">
                  {loading ? '—' : formatCurrency(metrics.revenue)}
                </h1>
              </div>
              <DeltaPill loading={loading} delta={metrics.revenueDelta} fallback={`${metrics.orderCount} ${t('orders')}`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-full border border-black/[0.05] bg-[#f7f8f5] p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={cn(
                    'min-h-[36px] rounded-full px-4 text-sm font-semibold transition-colors',
                    range === r.key ? 'bg-[#17191c] text-white' : 'text-[#7f858d] hover:text-[#17191c]',
                  )}
                >
                  {t(r.label)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/demo/orders/new')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#17191c] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.8)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#563ed5]"
            >
              {t('New order')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(480px,1.65fr)_minmax(270px,0.9fr)]">
          <MetricStack loading={loading} metrics={metrics} range={range} />
          <ActivityPanel
            loading={loading}
            orders={data.orders}
            range={range}
            chartTab={chartTab}
            setChartTab={setChartTab}
            metrics={metrics}
            navigate={navigate}
          />
          <ProgressPanel navigate={navigate} loading={loading} fulfilmentScore={fulfilmentScore} data={data} orders={data.orders} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:grid-cols-[minmax(330px,0.75fr)_minmax(0,1.25fr)_minmax(290px,0.7fr)]">
          <ActionQueue items={actionItems} loading={loading} navigate={navigate} />
          <RecentOrdersSection
            currentStoreName={currentStore?.name}
            loadError={loadError}
            orders={data.orders.slice(0, 5)}
            navigate={navigate}
          />
          <ActionsPanel navigate={navigate} aiSummary={data.aiSummary} />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TargetCard loading={loading} target={data.target} orders={data.orders} />
          <ChannelMixCard loading={loading} orders={metrics.inRange} />
          <TopProductsCard loading={loading} orders={metrics.inRange} productNames={data.productNames} />
        </section>
      </div>
    </SellerOSLayout>
  );
}

function DeltaPill({ loading, delta, fallback }: { loading: boolean; delta: number | null; fallback: string }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#f4f5f2] px-3 py-1.5 text-xs font-bold text-[#8b9098]">
        Loading
      </span>
    );
  }
  if (delta == null) {
    return (
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#563ed5] px-3 py-1.5 text-xs font-bold text-white">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {fallback}
      </span>
    );
  }
  const positive = delta >= 0;
  return (
    <span className={cn(
      'mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
      positive ? 'bg-[#563ed5] text-white' : 'bg-[#fdecec] text-[#c2352b]',
    )}>
      {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {positive ? '+' : ''}{delta.toFixed(0)}% {t('vs previous')}
    </span>
  );
}

function MetricStack({ loading, metrics, range }: {
  loading: boolean;
  metrics: { revenue: number; orderCount: number; liveQueue: number };
  range: RangeKey;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-[#fbfcf8] p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.6)]">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#563ed5]" title={t('Sales pulse')} />
        <span className="rounded-full bg-[#17191c] px-2.5 py-1 text-[11px] font-semibold text-white">
          {range === 'today' ? t('Now') : range === '7d' ? '7d' : '30d'}
        </span>
      </div>
      <div className="mt-9">
        <p className="text-5xl font-semibold leading-none tracking-[-0.05em] text-[#111315]">
          {loading ? '—' : formatCurrency(metrics.revenue)}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f959d]">
          {range === 'today' ? t('Sales today') : `${t('Revenue')} · ${range === '7d' ? t('7 days') : t('30 days')}`}
        </p>
      </div>
      <div className="mt-12 grid grid-cols-2 divide-x divide-black/[0.06] border-t border-black/[0.06] pt-5">
        <SmallMetric label={t('Orders')} value={loading ? '—' : metrics.orderCount.toString()} />
        <SmallMetric label={t('Live queue')} value={loading ? '—' : metrics.liveQueue.toString()} align="right" />
      </div>
    </div>
  );
}

function buildChart(orders: OrderRow[], range: RangeKey, tab: ChartTab) {
  const now = new Date();
  const buckets: { label: string; value: number; customers: Set<string> }[] = [];

  if (range === 'today') {
    const currentHour = now.getHours();
    for (let h = 0; h <= currentHour; h++) {
      buckets.push({ label: `${h}:00`, value: 0, customers: new Set() });
    }
    const midnight = startOfToday();
    for (const o of orders) {
      const t = new Date(o.created_at);
      if (t.getTime() < midnight || o.fulfillment_status === 'cancelled') continue;
      const bucket = buckets[t.getHours()];
      if (!bucket) continue;
      bucket.value += tab === 'revenue' ? Number(o.total || 0) : tab === 'orders' ? 1 : 0;
      bucket.customers.add(o.customer ? JSON.stringify(o.customer) : 'walk-in');
    }
  } else {
    const days = range === '7d' ? 7 : 30;
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      buckets.push({
        label: date.toLocaleDateString(brand.locale, days === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
        value: 0,
        customers: new Set(),
      });
    }
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
    for (const o of orders) {
      const t = new Date(o.created_at);
      if (o.fulfillment_status === 'cancelled') continue;
      const dayIndex = Math.floor((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - startDay) / DAY);
      const bucket = buckets[dayIndex];
      if (!bucket) continue;
      bucket.value += tab === 'revenue' ? Number(o.total || 0) : tab === 'orders' ? 1 : 0;
      bucket.customers.add(o.customer ? JSON.stringify(o.customer) : 'walk-in');
    }
  }

  if (tab === 'customers') {
    buckets.forEach((b) => { b.value = b.customers.size; });
  }
  return buckets;
}

function ActivityPanel({ loading, orders, range, chartTab, setChartTab, metrics, navigate }: {
  loading: boolean;
  orders: OrderRow[];
  range: RangeKey;
  chartTab: ChartTab;
  setChartTab: (tab: ChartTab) => void;
  metrics: { orderCount: number; liveQueue: number; avgOrder: number };
  navigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  const chart = useMemo(() => buildChart(orders, range, chartTab), [orders, range, chartTab]);
  const max = Math.max(1, ...chart.map((b) => b.value));
  const maxIndex = chart.findIndex((b) => b.value === max);

  const headline = [
    { label: t('Orders'), value: loading ? '—' : metrics.orderCount.toString(), helper: range === 'today' ? t('today') : t('in range'), icon: ShoppingCart },
    { label: t('Live'), value: loading ? '—' : metrics.liveQueue.toString(), helper: t('needs action'), icon: Zap, highlight: metrics.liveQueue > 0 },
    { label: t('Avg order'), value: loading ? '—' : formatCurrency(metrics.avgOrder), helper: t('basket value'), icon: IndianRupee },
  ];

  const tabs: { key: ChartTab; label: string }[] = [
    { key: 'revenue', label: t('Revenue') },
    { key: 'orders', label: t('Orders') },
    { key: 'customers', label: t('Customers') },
  ];

  return (
    <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <PanelTitle dot="bg-[#563ed5]" title={t('Analytics')} />
          <div className="mt-6 flex flex-wrap gap-6 md:gap-10">
            {headline.map((metric) => (
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
        <button
          type="button"
          onClick={() => navigate('/demo/analytics')}
          className="inline-flex items-center gap-1 self-start rounded-full bg-[#f4f5f2] px-3 py-2 text-xs font-bold text-[#737a83] transition-colors hover:text-[#17191c]"
        >
          {t('Full analytics')} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-8 flex h-[190px] items-end gap-1.5 overflow-hidden rounded-[24px] bg-[#fbfcf8] px-4 pb-5 pt-7 sm:gap-2">
        {chart.map((bucket, index) => {
          const height = Math.max(4, Math.round((bucket.value / max) * 100));
          const active = index === maxIndex && bucket.value > 0;
          const tooltip = `${bucket.label} — ${chartTab === 'revenue' ? formatCurrency(bucket.value) : bucket.value}`;
          return (
            <div key={index} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" title={tooltip}>
              <div
                className={cn(
                  'w-full max-w-[26px] rounded-full transition-all',
                  active ? 'bg-[#563ed5] shadow-[0_0_24px_rgba(86,62,213,0.28)]' : bucket.value === 0 ? 'bg-[#e8eae6]' : 'bg-[#1d2024] group-hover:bg-[#563ed5]'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setChartTab(tab.key)}
            aria-pressed={chartTab === tab.key}
            className={cn(
              'min-h-8 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors',
              chartTab === tab.key ? 'bg-[#563ed5] text-white' : 'bg-[#f4f5f2] text-[#757b84] hover:text-[#17191c]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressPanel({ navigate, loading, fulfilmentScore, data, orders }: {
  navigate: (path: string) => void;
  loading: boolean;
  fulfilmentScore: number | null;
  data: HubData;
  orders: OrderRow[];
}) {
  const { t } = useTranslation();
  const toPack = orders.filter((o) => ['new', 'unfulfilled', 'pending', 'accepted', 'picking'].includes(o.fulfillment_status || '')).length;
  const toShip = orders.filter((o) => o.fulfillment_status === 'packed').length;

  const progressRows = [
    { label: t('Packing'), value: loading ? '—' : `${toPack} ${t('open')}`, path: '/demo/fulfillment', active: toPack > 0 },
    { label: t('Shipping'), value: loading ? '—' : `${toShip} ${t('ready')}`, path: '/demo/shipping', active: toPack === 0 && toShip > 0 },
    { label: t('Returns'), value: loading ? '—' : `${data.pendingReturns} ${t('review')}`, path: '/demo/returns', active: false },
  ];

  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-[#f0f2f0] p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#563ed5]" title={t('Progress')} />
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#5e656f]">30d</span>
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
          <span className="block text-xs font-semibold text-[#777e87]">{t('On-time dispatch')}</span>
          <span className="mt-1 block text-5xl font-semibold leading-none tracking-[-0.06em] text-[#111315]">
            {loading || fulfilmentScore == null ? '—' : `${fulfilmentScore}%`}
          </span>
        </span>
      </button>
      <div className="mt-5 space-y-2">
        {progressRows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => navigate(row.path)}
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

function ActionQueue({ items, loading, navigate }: {
  items: { key: string; icon: React.ElementType; label: string; count: number; displayValue?: string; path: string; urgent: boolean; detail: string }[];
  loading: boolean;
  navigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] md:p-6">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#c2352b]" title={t('Needs attention')} />
        {!loading && items.length > 0 && (
          <span className="rounded-full bg-[#fdecec] px-2.5 py-1 text-[11px] font-bold text-[#c2352b]">
            {items.length} queue{items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm font-semibold text-[#8b9098]">Checking queues…</p>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-black/[0.08] bg-[#fbfcf8] px-5 py-10 text-center">
          <PackageCheck className="mx-auto mb-3 h-9 w-9 text-[#43a047]" />
          <p className="text-sm font-bold text-[#17191c]">{t('All clear')}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-[#8b9098]">
            {t('No overdue orders, returns, or stock alerts right now.')}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="group flex min-h-[64px] w-full items-center gap-3 rounded-[20px] bg-[#fbfcf8] px-4 text-left transition-colors hover:bg-[#f4f5f2]"
            >
              <span className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                item.urgent ? 'bg-[#fdecec] text-[#c2352b]' : 'bg-[#eef0fb] text-[#563ed5]',
              )}>
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#17191c]">{item.label}</span>
                <span className="block text-xs font-medium text-[#8b9098]">{item.detail}</span>
              </span>
              <span className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                item.urgent ? 'bg-[#c2352b] text-white' : 'bg-[#563ed5] text-white',
              )}>
                {item.displayValue ?? item.count}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#b7bdc5] transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionsPanel({ navigate, aiSummary }: { navigate: (path: string) => void; aiSummary: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]">
        <PanelTitle dot="bg-[#563ed5]" title={t('Actions')} />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {primaryActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex min-h-[86px] flex-col justify-between rounded-[20px] border border-black/[0.04] bg-[#fbfcf8] p-3 text-left transition-transform hover:scale-[1.02]"
            >
              <action.icon className="h-5 w-5 text-[#17191c]" />
              <span className="text-sm font-bold text-[#17191c]">{t(action.label)}</span>
            </button>
          ))}
        </div>
        <MoreActionsPopover navigate={navigate} />
      </div>
      <button
        type="button"
        onClick={() => navigate('/demo/ai-coach')}
        className="block w-full rounded-[26px] bg-[#563ed5] p-5 text-left text-white shadow-[0_18px_45px_-34px_rgba(86,62,213,0.45)] transition-transform hover:scale-[1.01]"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{t('AI Coach · today')}</p>
          <Bot className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-medium leading-6 text-white/90">
          {aiSummary || t('Open the AI Coach for today’s prioritized follow-ups, stock priorities, and pitch ideas.')}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-white/80">
          {t('Open coach')} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  );
}

function MoreActionsPopover({ navigate }: { navigate: (path: string) => void }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-[#f4f5f2] px-4 text-sm font-bold text-[#5e656f] transition-colors hover:text-[#17191c]"
        >
          <MoreHorizontal className="h-4 w-4" />
          {t('More controls')}
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
            {t(a.label)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TargetCard({ loading, target, orders }: {
  loading: boolean;
  target: { target_amount: number; start_date: string } | null;
  orders: OrderRow[];
}) {
  const { t } = useTranslation();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const achieved = orders
    .filter((o) => new Date(o.created_at).getTime() >= monthStart && o.fulfillment_status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const targetAmount = Number(target?.target_amount || 0);
  const pct = targetAmount > 0 ? Math.min(100, Math.round((achieved / targetAmount) * 100)) : null;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]">
      <div className="flex items-center justify-between">
        <PanelTitle dot="bg-[#563ed5]" title={t('Monthly target')} />
        <Target className="h-4 w-4 text-[#9aa0a8]" />
      </div>
      <p className="mt-6 text-4xl font-semibold leading-none tracking-[-0.05em] text-[#111315]">
        {loading ? '—' : pct == null ? '—' : `${pct}%`}
      </p>
      <p className="mt-2 text-xs font-semibold text-[#8b9098]">
        {loading || pct == null
          ? t('No target configured yet')
          : `${formatCurrency(achieved)} / ${formatCurrency(targetAmount)} · ${daysLeft} ${t('days left')}`}
      </p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#f0f2f0]">
        <div
          className="h-full rounded-full bg-[#563ed5] transition-all"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {!loading && pct != null && pct < 100 && targetAmount > achieved && daysLeft > 0 && (
        <p className="mt-4 text-xs font-medium text-[#8b9098]">
          Need about <span className="font-bold text-[#17191c]">{formatCurrency((targetAmount - achieved) / daysLeft)}</span> per day to close the gap.
        </p>
      )}
    </div>
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Website',
  amazon: 'Amazon',
  instagram: 'Instagram',
  in_store: 'In store',
  walk_in: 'Walk-in',
  ondc: 'ONDC',
};

function ChannelMixCard({ loading, orders }: { loading: boolean; orders: OrderRow[] }) {
  const { t } = useTranslation();
  const mix = useMemo(() => {
    const byChannel: Record<string, number> = {};
    for (const o of orders) {
      if (o.fulfillment_status === 'cancelled') continue;
      const key = o.channel || 'other';
      byChannel[key] = (byChannel[key] || 0) + Number(o.total || 0);
    }
    const total = Object.values(byChannel).reduce((s, v) => s + v, 0);
    return Object.entries(byChannel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([channel, revenue]) => ({
        channel,
        revenue,
        share: total > 0 ? Math.round((revenue / total) * 100) : 0,
      }));
  }, [orders]);

  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]">
      <PanelTitle dot="bg-[#563ed5]" title={t('Channel mix')} />
      {loading ? (
        <p className="mt-6 text-sm font-semibold text-[#8b9098]">Loading…</p>
      ) : mix.length === 0 ? (
        <p className="mt-6 text-sm font-semibold text-[#8b9098]">{t('No orders in this range yet.')}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {mix.map((row) => (
            <div key={row.channel}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[#17191c]">{CHANNEL_LABELS[row.channel] || row.channel}</p>
                <p className="text-xs font-semibold tabular-nums text-[#777e87]">
                  {formatCurrency(row.revenue)} · {row.share}%
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0f2f0]">
                <div className="h-full rounded-full bg-[#563ed5]" style={{ width: `${Math.max(3, row.share)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopProductsCard({ loading, orders, productNames }: {
  loading: boolean;
  orders: OrderRow[];
  productNames: Record<string, string>;
}) {
  const { t } = useTranslation();
  const top = useMemo(() => {
    const byProduct: Record<string, { revenue: number; units: number }> = {};
    for (const o of orders) {
      if (o.fulfillment_status === 'cancelled') continue;
      for (const item of o.order_items || []) {
        const entry = (byProduct[item.product_id] ||= { revenue: 0, units: 0 });
        entry.revenue += Number(item.total_price || 0);
        entry.units += Number(item.quantity || 0);
      }
    }
    return Object.entries(byProduct)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 4)
      .map(([productId, stats]) => ({ productId, ...stats }));
  }, [orders]);

  return (
    <div className="rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] md:col-span-2 xl:col-span-1">
      <PanelTitle dot="bg-[#563ed5]" title={t('Top products')} />
      {loading ? (
        <p className="mt-6 text-sm font-semibold text-[#8b9098]">Loading…</p>
      ) : top.length === 0 ? (
        <p className="mt-6 text-sm font-semibold text-[#8b9098]">{t('No sales in this range yet.')}</p>
      ) : (
        <div className="mt-5 space-y-2">
          {top.map((row, index) => (
            <div key={row.productId} className="flex min-h-[52px] items-center gap-3 rounded-[18px] bg-[#fbfcf8] px-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0fb] text-xs font-bold text-[#563ed5]">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#17191c]">
                {productNames[row.productId] || 'Product'}
              </p>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-[#17191c]">{formatCurrency(row.revenue)}</p>
                <p className="text-[11px] font-medium text-[#9aa0a8]">{row.units} unit{row.units === 1 ? '' : 's'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCustomerName(customer: OrderRow['customer']) {
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
  orders: OrderRow[];
  navigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] md:p-6">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle dot="bg-[#563ed5]" title={t('Recent orders')} />
        <button
          type="button"
          onClick={() => navigate('/demo/orders')}
          className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f2] px-3 py-2 text-xs font-bold text-[#737a83] transition-colors hover:text-[#17191c]"
        >
          {t('View all')} <ArrowRight className="h-3.5 w-3.5" />
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
            {currentStoreName ? t('No recent orders yet') : 'Choose a store to see live orders'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-[#8b9098]">
            {currentStoreName
              ? t('Create your first order and it will show up here right away.')
              : 'Once a store is active, today’s queue and revenue will stay in view.'}
          </p>
          {currentStoreName && (
            <button
              type="button"
              onClick={() => navigate('/demo/orders/new')}
              className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#17191c] px-5 text-xs font-bold text-white"
            >
              {t('Create order')}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {orders.map((order) => {
            const customerName = getCustomerName(order.customer);
            const statusLabel = order.fulfillment_status?.replace('_', ' ') || 'new';
            const isDelivered = order.fulfillment_status === 'delivered';
            const isUnfulfilled = ['unfulfilled', 'new', 'pending'].includes(order.fulfillment_status || '');
            const orderNumber = order.order_number || `#${order.id.slice(0, 8)}`;
            const createdAt = new Date(order.created_at);
            const isToday = createdAt.getTime() >= startOfToday();

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
                    {formatCurrency(Number(order.total || 0))}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#9aa0a8]">
                    {isToday
                      ? createdAt.toLocaleTimeString(brand.locale, { hour: '2-digit', minute: '2-digit' })
                      : createdAt.toLocaleDateString(brand.locale, { day: 'numeric', month: 'short' })}
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
