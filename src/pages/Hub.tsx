import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, ArrowUpRight, BarChart3, Bot, Boxes, CheckCircle2, Clock3, IndianRupee, Package, Plus, RefreshCw, ShoppingBag, ShoppingCart, Users } from 'lucide-react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { FULFILLMENT_CONFIG } from '@/lib/channelConnectors';
import { getHubMetrics, orderValue, type HubOrder, type HubPeriod } from '@/lib/hubMetrics';
import { cn } from '@/lib/utils';

interface StockItem {
  id: string;
  quantity: number;
  min_stock_level: number | null;
  product: { name: string; image_urls: string[] | null } | null;
  cigar: { name: string; image_url: string | null } | null;
}

const actions = [
  { label: 'Orders', path: '/demo/orders', icon: ShoppingCart, roles: ['admin', 'manager', 'sales', 'operations'] },
  { label: 'Catalogue', path: '/demo/catalogue', icon: ShoppingBag, roles: ['admin', 'manager', 'sales', 'operations'] },
  { label: 'Inventory', path: '/demo/inventory', icon: Boxes, roles: ['admin', 'manager', 'operations'] },
  { label: 'Customers', path: '/demo/customers', icon: Users, roles: ['admin', 'manager', 'sales'] },
  { label: 'Finance', path: '/demo/finance', icon: IndianRupee, roles: ['admin', 'finance'] },
  { label: 'Analytics', path: '/demo/analytics', icon: BarChart3, roles: ['admin', 'manager', 'finance'] },
];
const periods: { value: HubPeriod; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' }, { value: 'all', label: 'All time' },
];
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const compact = (value: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#563ed5] focus-visible:ring-offset-2';
const panel = 'min-w-0 rounded-lg border border-black/[0.06] bg-white p-4 sm:p-5';

function customerName(order: HubOrder) {
  return (Array.isArray(order.customer) ? order.customer[0]?.name : order.customer?.name) || 'Walk-in';
}

function orderDate(value: string | null) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Hub() {
  const { role } = useAuth();
  const { currentStore, loading: storesLoading } = useStore();
  const [period, setPeriod] = useState<HubPeriod>('7d');
  const [chartMetric, setChartMetric] = useState<'value' | 'orders'>('value');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState(false);
  const [data, setData] = useState<{ storeId: string | null; orders: HubOrder[]; stock: StockItem[]; updated: Date }>({ storeId: null, orders: [], stock: [], updated: new Date() });
  const visibleActions = actions.filter(action => action.roles.includes(role || ''));
  const canOrders = visibleActions.some(action => action.label === 'Orders');
  const canInventory = visibleActions.some(action => action.label === 'Inventory');
  const canAnalytics = visibleActions.some(action => action.label === 'Analytics');
  const canCoach = ['admin', 'manager', 'sales'].includes(role || '');
  const storeId = currentStore?.id;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setStockError(false);
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const fetch = async () => {
      try {
        const [orders, inventory] = await Promise.all([
          supabase.from('orders').select('id, order_number, total, status, fulfillment_status, is_voided, created_at, sla_deadline, customer:customers(name)').eq('store_id', storeId).order('created_at', { ascending: false }),
          canInventory
            ? supabase.from('store_inventory').select('id, quantity, min_stock_level, product:products(name, image_urls), cigar:cigars(name, image_url)').eq('store_id', storeId)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (orders.error) throw orders.error;
        if (cancelled) return;
        setData({ storeId, orders: (orders.data || []) as HubOrder[], stock: (inventory.data || []) as StockItem[], updated: new Date() });
        setStockError(!!inventory.error);
      } catch {
        if (!cancelled) setError('We could not update this store. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [storeId, refresh, canInventory]);

  const ready = !!storeId && data.storeId === storeId && !error;
  const pending = storesLoading || loading || (!!storeId && data.storeId !== storeId && !error);
  const metrics = useMemo(() => getHubMetrics(ready ? data.orders : [], period, data.updated), [ready, data, period]);
  const lowStock = useMemo(() => ready ? data.stock.filter(item => item.quantity <= 0 || (item.min_stock_level !== null && item.quantity <= item.min_stock_level)).sort((a, b) => a.quantity - b.quantity) : [], [ready, data.stock]);
  const priorities = useMemo(() => [...metrics.openOrders].sort((a, b) => {
    const aDue = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity;
    const bDue = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity;
    return aDue - bDue || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  }).slice(0, 3), [metrics.openOrders]);
  const unavailable = !ready || pending;
  const selectedPeriod = periods.find(item => item.value === period)!.label;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SellerOSLayout>
      <div className="mx-auto max-w-[1440px] space-y-5 pb-24 text-[#191b1f] md:space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">Store overview</h1>
            <p className="mt-1 break-words text-xs text-muted-foreground">{currentStore?.name || 'Hub'} · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          {canOrders && <Button asChild className="min-h-11 shrink-0 gap-2 bg-[#17191c] hover:bg-[#303238] hover:translate-y-0"><Link to="/demo/orders/new"><Plus className="h-4 w-4" /> New order</Link></Button>}
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Reporting period" className="grid flex-1 grid-cols-4 rounded-full border border-black/[0.05] bg-white p-1 sm:max-w-sm">
            {periods.map(item => <button key={item.value} type="button" aria-pressed={period === item.value} onClick={() => setPeriod(item.value)} className={cn('min-h-11 whitespace-nowrap rounded-full px-1 text-xs font-semibold sm:px-2 sm:text-sm', focus, period === item.value ? 'bg-[#563ed5] text-white' : 'text-[#6c727b] hover:bg-[#f0f1f3]')}>{item.label}</button>)}
          </div>
          <Button variant="outline" size="icon" aria-label="Refresh Hub" title="Refresh Hub" className="h-11 w-11 shrink-0" disabled={pending || !storeId} onClick={() => setRefresh(value => value + 1)}><RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} /></Button>
        </div>

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><Button variant="outline" className="min-h-11" onClick={() => setRefresh(value => value + 1)}>Try again</Button></div>}
        {!storeId && !storesLoading && <div role="status" className={panel}><p className="font-semibold">No store selected</p><p className="mt-1 text-sm text-muted-foreground">Select a store from the store menu to view its activity.</p></div>}

        <section aria-label="Store metrics" aria-busy={pending} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="Order value" value={money(metrics.total)} helper={`${selectedPeriod} · before refunds`} icon={IndianRupee} unavailable={unavailable} loading={pending} accent />
          <Metric label="Orders placed" value={String(metrics.count)} helper={selectedPeriod} icon={ShoppingCart} unavailable={unavailable} loading={pending} />
          <Metric label="Open orders" value={String(metrics.openOrders.length)} helper="Across all dates" icon={Activity} unavailable={unavailable} loading={pending} />
          <Metric label="Average order" value={money(metrics.average)} helper={selectedPeriod} icon={BarChart3} unavailable={unavailable} loading={pending} />
        </section>

        {visibleActions.length > 0 && <nav aria-label="Hub shortcuts" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {visibleActions.map(action => <Link key={action.path} to={action.path} className={cn('flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-lg border border-black/[0.05] bg-white px-2 py-2 text-xs font-semibold hover:bg-[#eceef2] sm:px-4 sm:text-sm', focus)}><action.icon className="h-4 w-4 shrink-0 text-[#563ed5]" /><span className="break-words">{action.label}</span></Link>)}
        </nav>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section aria-labelledby="attention-title" className={cn(panel, 'lg:order-2')}>
            <SectionTitle id="attention-title" title="Needs attention" icon={Clock3} />
            <p className="mt-1 text-xs text-muted-foreground">Open work across all dates</p>
            {pending ? <LoadingRows /> : !ready ? <Unavailable /> : <>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={cn('rounded-full px-3 py-1.5 font-semibold', metrics.overdue.length ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>{metrics.overdue.length} overdue</span>
                <span className="rounded-full bg-[#f1effc] px-3 py-1.5 font-semibold text-[#563ed5]">{metrics.openOrders.length} open</span>
              </div>
              {priorities.length ? <div className="mt-3 divide-y divide-black/[0.05]">{priorities.map(order => <OrderLine key={order.id} order={order} canOpen={canOrders} priority />)}</div> : <div className="flex items-center gap-3 py-7"><CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" /><div><p className="text-sm font-semibold">Order queue is clear</p><p className="mt-1 text-xs text-muted-foreground">No orders awaiting fulfillment.</p></div></div>}
              {canOrders && <Link to="/demo/orders" className={cn('mt-3 flex min-h-11 items-center justify-between rounded-lg bg-[#f1effc] px-3 text-sm font-semibold text-[#563ed5] hover:bg-[#e8e4fc]', focus)}>Open order queue <ArrowRight className="h-4 w-4" /></Link>}
              {canInventory && !stockError && lowStock.length > 0 && <Link to="/demo/inventory" className={cn('mt-2 flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium hover:bg-[#f0f1f3]', focus)}><span>{lowStock.length} stock {lowStock.length === 1 ? 'item needs' : 'items need'} attention</span><ArrowUpRight className="h-4 w-4 shrink-0" /></Link>}
            </>}
          </section>

          <section aria-labelledby="trend-title" className={cn(panel, 'lg:order-1')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle id="trend-title" title="Sales activity" icon={BarChart3} />
              <div role="group" aria-label="Chart metric" className="flex rounded-full bg-[#f4f5f6] p-1">
                {(['value', 'orders'] as const).map(metric => <button key={metric} aria-pressed={chartMetric === metric} onClick={() => setChartMetric(metric)} className={cn('min-h-11 rounded-full px-3 text-xs font-semibold', focus, chartMetric === metric ? 'bg-[#17191c] text-white' : 'text-muted-foreground hover:bg-[#e8eaee]')}>{metric === 'value' ? 'Order value' : 'Orders'}</button>)}
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3"><p className="break-all text-3xl font-semibold tabular-nums">{unavailable ? '-' : chartMetric === 'value' ? money(metrics.total) : metrics.count}</p><span className="text-xs text-muted-foreground">{selectedPeriod}</span></div>
            <div className="mt-4 h-[220px] min-w-0 sm:h-[250px]">
              {pending ? <div role="status" aria-label="Loading sales activity" className="h-full rounded-lg animate-shimmer" /> : !ready ? <Unavailable /> : metrics.count === 0 ? <div className="flex h-full flex-col items-center justify-center border-y border-dashed text-center"><BarChart3 className="h-8 w-8 text-[#969ca5]" /><p className="mt-3 text-sm font-semibold">No orders in this period</p><p className="mt-1 text-xs text-muted-foreground">{data.orders[0] ? `Most recent order: ${orderDate(data.orders[0].created_at)}` : 'Sales activity will appear after your first order.'}</p>{period !== 'all' && data.orders.length > 0 && <Button variant="ghost" className="mt-2 min-h-11 text-[#563ed5]" onClick={() => setPeriod('all')}>View all time <ArrowRight className="h-4 w-4" /></Button>}</div> :
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.trend} accessibilityLayer margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eceef1" strokeDasharray="3 5" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 11, fill: '#747b85' }} dy={8} />
                    <YAxis tickLine={false} axisLine={false} width={52} allowDecimals={false} tickFormatter={compact} tick={{ fontSize: 11, fill: '#747b85' }} />
                    <Tooltip cursor={{ fill: '#f1effc' }} labelFormatter={(_, payload) => payload[0]?.payload.fullLabel || ''} formatter={(value: number) => [chartMetric === 'value' ? money(value) : value, chartMetric === 'value' ? 'Order value' : 'Orders']} contentStyle={{ border: '1px solid #eceef1', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey={chartMetric} fill="#563ed5" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="text-xs text-muted-foreground">Voided, cancelled and declined orders excluded.</p>{canAnalytics && <Link to="/demo/analytics" className={cn('inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#563ed5]', focus)}>Analytics <ArrowUpRight className="h-4 w-4" /></Link>}</div>
          </section>

          <section aria-labelledby="recent-title" className={cn(panel, 'lg:order-3')}>
            <div className="flex items-center justify-between gap-2"><SectionTitle id="recent-title" title="Recent orders" icon={ShoppingCart} />{canOrders && <Link to="/demo/orders" className={cn('inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-[#563ed5]', focus)}>View all <ArrowRight className="h-4 w-4" /></Link>}</div>
            {pending ? <LoadingRows /> : !ready ? <Unavailable /> : data.orders.length ? <div className="mt-2 divide-y divide-black/[0.05]">{data.orders.slice(0, 5).map(order => <OrderLine key={order.id} order={order} canOpen={canOrders} />)}</div> : <div className="py-8 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No orders yet</p>{canOrders && <Button asChild className="mt-4 min-h-11"><Link to="/demo/orders/new"><Plus className="h-4 w-4" /> Create order</Link></Button>}</div>}
          </section>

          <div className="min-w-0 space-y-4 lg:order-4">
            {canInventory && <section aria-labelledby="stock-title" className={panel}>
              <div className="flex items-center justify-between gap-2"><SectionTitle id="stock-title" title="Stock watch" icon={Boxes} /><Link to="/demo/inventory" className={cn('flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-[#563ed5]', focus)}>Inventory <ArrowUpRight className="h-4 w-4" /></Link></div>
              {pending ? <LoadingRows /> : stockError ? <p role="status" className="py-5 text-sm text-muted-foreground">Stock could not be loaded. Refresh to try again.</p> : !ready ? <Unavailable /> : lowStock.length ? <div className="mt-2 divide-y divide-black/[0.05]">{lowStock.slice(0, 3).map(item => {
                const image = item.product?.image_urls?.[0] || item.cigar?.image_url;
                return <Link key={item.id} to="/demo/inventory" className={cn('flex min-h-20 items-center gap-3 rounded-md py-3 hover:bg-[#f7f8fa]', focus)}>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#f0f1f3]"><Package aria-hidden="true" className="absolute inset-3 h-6 w-6 text-muted-foreground" />{image && <img src={image} alt="" loading="lazy" className="relative h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}</div>
                  <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{item.product?.name || item.cigar?.name || 'Product'}</p><p className={cn('mt-1 text-xs', item.quantity <= 0 ? 'text-red-700' : 'text-amber-700')}>{item.quantity <= 0 ? 'Out of stock' : `${item.quantity} left · minimum ${item.min_stock_level}`}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>;
              })}</div> : <div className="flex items-center gap-3 py-6"><CheckCircle2 className="h-6 w-6 text-emerald-600" /><p className="text-sm">{data.stock.length ? 'Stock levels are above their minimums.' : 'No inventory at this store yet.'}</p></div>}
            </section>}
            {canCoach && <Link to="/demo/ai-coach" className={cn('flex min-h-24 items-center gap-4 rounded-lg bg-[#17191c] p-5 text-white hover:bg-[#292c31]', focus)}><Bot className="h-6 w-6 shrink-0 text-[#c4bafa]" /><div className="min-w-0 flex-1"><p className="font-semibold">Plan your next move</p><p className="mt-1 text-sm text-[#bdc2cb]">Review today's AI recommendations</p></div><ArrowUpRight className="h-5 w-5 shrink-0" /></Link>}
          </div>
        </div>
        {ready && !pending && <p className="text-xs text-muted-foreground">Updated {data.updated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>}
      </div>
    </SellerOSLayout>
  );
}

function Metric({ label, value, helper, icon: Icon, loading, unavailable, accent }: { label: string; value: string; helper: string; icon: React.ElementType; loading: boolean; unavailable: boolean; accent?: boolean }) {
  return <div className={cn('min-w-0 rounded-lg border p-3 sm:p-4', accent ? 'border-[#ded8fa] bg-[#f1effc]' : 'border-black/[0.06] bg-white')}>
    <div className="flex items-center gap-2 text-xs font-medium text-[#646b76]"><Icon className={cn('h-4 w-4 shrink-0', accent && 'text-[#563ed5]')} /><span>{label}</span></div>
    {loading ? <div className="mt-2 h-8 max-w-32 rounded-md animate-shimmer" /> : <p className="mt-2 break-all text-2xl font-semibold leading-tight tabular-nums sm:text-3xl">{unavailable ? '-' : value}</p>}
    <p className="mt-1 text-[11px] text-[#747b85]">{helper}</p>
  </div>;
}

function SectionTitle({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) {
  return <div className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-[#563ed5]" /><h2 id={id} className="text-sm font-semibold sm:text-base">{title}</h2></div>;
}

function OrderLine({ order, canOpen, priority = false }: { order: HubOrder; canOpen: boolean; priority?: boolean }) {
  const status = order.is_voided ? 'Voided' : order.fulfillment_status === 'pending' ? 'New' : FULFILLMENT_CONFIG[order.fulfillment_status || 'new']?.label || order.fulfillment_status?.replace(/_/g, ' ') || 'New';
  const content = <>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="break-all font-mono text-xs font-semibold">{order.order_number || `#${order.id.slice(0, 8)}`}</span><span className="rounded-full bg-[#f0f1f3] px-2 py-1 text-[10px] font-medium text-[#646b76]">{status}</span></div><p className="mt-1 break-words text-sm">{customerName(order)}</p><p className="mt-1 text-[11px] text-muted-foreground">{orderDate(order.created_at)}</p></div>
    <span className="shrink-0 text-sm font-semibold tabular-nums">{money(orderValue(order))}</span>{canOpen && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
  </>;
  const className = cn('flex min-h-20 items-center gap-2 rounded-md py-3', canOpen && 'hover:bg-[#f7f8fa]', priority && 'min-h-[88px]', focus);
  return canOpen ? <Link aria-label={`Open order ${order.order_number || order.id}`} to={`/demo/orders/${order.id}`} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function LoadingRows() {
  return <div role="status" aria-label="Loading store activity" className="mt-4 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-lg animate-shimmer" />)}</div>;
}

function Unavailable() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Store activity is unavailable.</p>;
}
