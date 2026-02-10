import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package,
  Store, Globe, Instagram, MessageCircle, ShoppingCart, FileSpreadsheet,
  BarChart3, Calendar,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHANNEL_CONFIG, type SalesChannel } from '@/lib/channelConnectors';

interface OrderRow {
  id: string;
  total: number;
  subtotal: number;
  channel: string;
  status: string;
  fulfillment_status: string;
  created_at: string;
  customer_id: string | null;
}

interface ProductSale {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store, website: Globe, instagram: Instagram,
  whatsapp: MessageCircle, marketplace: ShoppingCart, csv_import: FileSpreadsheet,
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(330, 80%, 60%)', 'hsl(200, 80%, 50%)', 'hsl(30, 90%, 55%)', 'hsl(270, 60%, 55%)'];

export default function Analytics() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<{ id: string; created_at: string }[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ordersRes, customersRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('id, total, subtotal, channel, status, fulfillment_status, created_at, customer_id').eq('is_voided', false).order('created_at', { ascending: true }),
      supabase.from('customers').select('id, created_at').order('created_at', { ascending: true }),
      supabase.from('order_items').select('quantity, unit_price, total_price, cigar:cigars(name), product:products(name)'),
    ]);
    setOrders((ordersRes.data as OrderRow[]) || []);
    setCustomers(customersRes.data || []);

    // Aggregate top products
    const productMap: Record<string, ProductSale> = {};
    (itemsRes.data || []).forEach((item: any) => {
      const name = item.product?.name || item.cigar?.name || 'Unknown';
      if (!productMap[name]) productMap[name] = { product_name: name, total_qty: 0, total_revenue: 0 };
      productMap[name].total_qty += item.quantity;
      productMap[name].total_revenue += Number(item.total_price);
    });
    setTopProducts(Object.values(productMap).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10));

    setLoading(false);
  };

  // Date filtering
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (period === '7d') return new Date(now.getTime() - 7 * 86400000);
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
    return new Date(now.getTime() - 365 * 86400000);
  }, [period]);

  const filteredOrders = useMemo(() => orders.filter(o => new Date(o.created_at) >= cutoffDate), [orders, cutoffDate]);
  const prevCutoff = useMemo(() => new Date(cutoffDate.getTime() - (Date.now() - cutoffDate.getTime())), [cutoffDate]);
  const prevOrders = useMemo(() => orders.filter(o => { const d = new Date(o.created_at); return d >= prevCutoff && d < cutoffDate; }), [orders, prevCutoff, cutoffDate]);

  // KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const orderCount = filteredOrders.length;
  const prevOrderCount = prevOrders.length;
  const orderCountChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : 0;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
  const aovChange = prevAOV > 0 ? ((avgOrderValue - prevAOV) / prevAOV) * 100 : 0;
  const filteredCustomers = customers.filter(c => new Date(c.created_at) >= cutoffDate);
  const prevCustomers = customers.filter(c => { const d = new Date(c.created_at); return d >= prevCutoff && d < cutoffDate; });
  const custChange = prevCustomers.length > 0 ? ((filteredCustomers.length - prevCustomers.length) / prevCustomers.length) * 100 : 0;

  // Sales trend (daily/weekly/monthly buckets)
  const salesTrend = useMemo(() => {
    const buckets: Record<string, { date: string; revenue: number; orders: number }> = {};
    const isLong = period === '90d' || period === '12m';
    filteredOrders.forEach(o => {
      const d = new Date(o.created_at);
      const key = isLong
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { date: key, revenue: 0, orders: 0 };
      buckets[key].revenue += Number(o.total);
      buckets[key].orders++;
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, period]);

  // Channel performance
  const channelPerf = useMemo(() => {
    const map: Record<string, { channel: string; revenue: number; orders: number }> = {};
    filteredOrders.forEach(o => {
      const ch = o.channel || 'in_store';
      if (!map[ch]) map[ch] = { channel: ch, revenue: 0, orders: 0 };
      map[ch].revenue += Number(o.total);
      map[ch].orders++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Top products (approximated from order count by channel — full item-level would need order_items join)
  // For now we show channel distribution as pie
  const channelPie = channelPerf.map(c => ({
    name: CHANNEL_CONFIG[c.channel as SalesChannel]?.label || c.channel,
    value: c.revenue,
  }));

  // Customer acquisition trend
  const custTrend = useMemo(() => {
    const buckets: Record<string, { date: string; count: number }> = {};
    const isLong = period === '90d' || period === '12m';
    filteredCustomers.forEach(c => {
      const d = new Date(c.created_at);
      const key = isLong
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { date: key, count: 0 };
      buckets[key].count++;
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredCustomers, period]);

  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const fmtDateLabel = (d: string) => {
    if (d.length === 7) return new Date(d + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Sales trends, channel performance & customer insights</p>
          </div>
          <div className="w-40">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), change: revenueChange, icon: DollarSign },
            { label: 'Orders', value: orderCount.toString(), change: orderCountChange, icon: ShoppingBag },
            { label: 'Avg Order Value', value: fmt(avgOrderValue), change: aovChange, icon: TrendingUp },
            { label: 'New Customers', value: filteredCustomers.length.toString(), change: custChange, icon: Users },
          ].map((kpi, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">{kpi.value}</p>
                  <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', kpi.change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {kpi.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {fmtPct(kpi.change)} vs prev period
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sales Trend Chart */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Sales Trend</h3>
          {salesTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No sales data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDateLabel} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => [fmt(v), 'Revenue']} labelFormatter={fmtDateLabel} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Performance */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Channel Performance</h3>
            {channelPerf.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No data</p>
            ) : (
              <div className="space-y-3">
                {channelPerf.map((ch, i) => {
                  const cfg = CHANNEL_CONFIG[ch.channel as SalesChannel] || CHANNEL_CONFIG.in_store;
                  const ChIcon = CHANNEL_ICONS[ch.channel] || Package;
                  const pct = totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-28 shrink-0', cfg.color)}>
                        <ChIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-right w-24 shrink-0">
                        <p className="text-sm font-semibold">{fmt(ch.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{ch.orders} orders</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue by Channel (Pie) */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Revenue Split by Channel</h3>
            {channelPie.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={channelPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {channelPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Top Selling Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No product data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
                <Tooltip formatter={(v: number, name: string) => [name === 'total_revenue' ? fmt(v) : v, name === 'total_revenue' ? 'Revenue' : 'Qty']} />
                <Bar dataKey="total_revenue" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Customer Acquisition */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Customer Acquisition</h3>
          {custTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No new customers in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={custTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDateLabel} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip labelFormatter={fmtDateLabel} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="New Customers" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
