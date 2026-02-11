import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package,
  Store, Globe, ShoppingCart, FileSpreadsheet, Download, Clock,
  BarChart3, Truck, AlertTriangle, UserCheck, Target, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CHANNEL_CONFIG, type SalesChannel } from '@/lib/channelConnectors';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';

function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface OrderRow {
  id: string; total: number; subtotal: number; channel: string; status: string;
  fulfillment_status: string; fulfillment_type: string; payment_type: string;
  created_at: string; accepted_at: string | null; packed_at: string | null;
  shipped_at: string | null; delivered_at: string | null;
  sla_deadline: string | null; customer_id: string | null;
  store_id: string | null; created_by: string; is_voided: boolean;
  items_count: number;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store, website: Globe, marketplace: ShoppingCart, csv_import: FileSpreadsheet,
};
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142,76%,36%)', 'hsl(330,80%,60%)', 'hsl(200,80%,50%)', 'hsl(30,90%,55%)', 'hsl(270,60%,55%)'];
const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

export default function Analytics() {
  const { role } = useAuth();
  const { stores, currentStore } = useStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<{ id: string; created_at: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [inventoryData, setInventoryData] = useState<{ cigar_id: string; quantity: number; min_stock_level: number | null; cigar?: { name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [ordersRes, custRes, profRes, invRes] = await Promise.all([
        supabase.from('orders').select('id, total, subtotal, channel, status, fulfillment_status, fulfillment_type, payment_type, created_at, accepted_at, packed_at, shipped_at, delivered_at, sla_deadline, customer_id, store_id, created_by, is_voided, items_count').order('created_at', { ascending: true }),
        supabase.from('customers').select('id, created_at'),
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('store_inventory').select('cigar_id, quantity, min_stock_level, cigar:cigars(name)'),
      ]);
      setOrders((ordersRes.data as unknown as OrderRow[]) || []);
      setCustomers(custRes.data || []);
      setProfiles(profRes.data || []);
      setInventoryData((invRes.data as any) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (period === '7d') return new Date(now.getTime() - 7 * 86400000);
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
    return new Date(now.getTime() - 365 * 86400000);
  }, [period]);

  const filteredOrders = useMemo(() => {
    let o = orders.filter(o => new Date(o.created_at) >= cutoffDate && !o.is_voided);
    if (storeFilter !== 'all') o = o.filter(o => o.store_id === storeFilter);
    return o;
  }, [orders, cutoffDate, storeFilter]);

  const prevCutoff = useMemo(() => new Date(cutoffDate.getTime() - (Date.now() - cutoffDate.getTime())), [cutoffDate]);
  const prevOrders = useMemo(() => {
    let o = orders.filter(o => { const d = new Date(o.created_at); return d >= prevCutoff && d < cutoffDate && !o.is_voided; });
    if (storeFilter !== 'all') o = o.filter(o => o.store_id === storeFilter);
    return o;
  }, [orders, prevCutoff, cutoffDate, storeFilter]);

  // ── SALES ──
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const orderCount = filteredOrders.length;
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

  const salesTrend = useMemo(() => {
    const buckets: Record<string, { date: string; revenue: number; orders: number }> = {};
    const isLong = period === '90d' || period === '12m';
    filteredOrders.forEach(o => {
      const d = new Date(o.created_at);
      const key = isLong ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : d.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { date: key, revenue: 0, orders: 0 };
      buckets[key].revenue += Number(o.total);
      buckets[key].orders++;
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, period]);

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

  const storePerf = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; orders: number }> = {};
    filteredOrders.forEach(o => {
      const sid = o.store_id || 'unknown';
      const store = stores.find(s => s.id === sid);
      if (!map[sid]) map[sid] = { name: store?.name || 'Unknown', revenue: 0, orders: 0 };
      map[sid].revenue += Number(o.total);
      map[sid].orders++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, stores]);

  // ── OPS ──
  const delivered = filteredOrders.filter(o => o.fulfillment_status === 'delivered');
  const slaHit = delivered.filter(o => o.sla_deadline && o.delivered_at && new Date(o.delivered_at) <= new Date(o.sla_deadline)).length;
  const slaRate = delivered.length > 0 ? (slaHit / delivered.length) * 100 : 0;
  const cancelled = filteredOrders.filter(o => ['cancelled', 'declined'].includes(o.fulfillment_status)).length;
  const cancelRate = orderCount > 0 ? (cancelled / orderCount) * 100 : 0;
  const packedOrders = filteredOrders.filter(o => o.accepted_at && o.packed_at);
  const avgPackMin = packedOrders.length > 0
    ? packedOrders.reduce((s, o) => s + differenceInMinutes(new Date(o.packed_at!), new Date(o.accepted_at!)), 0) / packedOrders.length
    : 0;
  const rtoCount = filteredOrders.filter(o => o.fulfillment_status === 'rto').length;

  // ── INVENTORY ──
  const oosItems = inventoryData.filter(i => i.quantity <= 0);
  const lowStockItems = inventoryData.filter(i => i.quantity > 0 && i.min_stock_level && i.quantity <= i.min_stock_level);
  const totalSkus = inventoryData.length;
  const avgStock = totalSkus > 0 ? inventoryData.reduce((s, i) => s + i.quantity, 0) / totalSkus : 0;

  // ── TEAM ──
  const teamPerf = useMemo(() => {
    return profiles.map(p => {
      const userOrders = filteredOrders.filter(o => o.created_by === p.id);
      return {
        name: p.full_name || p.email,
        orders: userOrders.length,
        revenue: userOrders.reduce((s, o) => s + Number(o.total), 0),
        cancelled: userOrders.filter(o => ['cancelled', 'declined'].includes(o.fulfillment_status)).length,
      };
    }).filter(t => t.orders > 0).sort((a, b) => b.revenue - a.revenue);
  }, [profiles, filteredOrders]);

  const fmtDateLabel = (d: string) => {
    if (d.length === 7) return new Date(d + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Sales, operations, inventory & team performance</p>
          </div>
          <div className="flex gap-3">
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Store" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="flex-wrap">
            <TabsTrigger value="sales"><DollarSign className="w-3 h-3 mr-1" /> Sales</TabsTrigger>
            <TabsTrigger value="ops"><Truck className="w-3 h-3 mr-1" /> Operations</TabsTrigger>
            <TabsTrigger value="inventory"><Package className="w-3 h-3 mr-1" /> Inventory</TabsTrigger>
            <TabsTrigger value="team"><UserCheck className="w-3 h-3 mr-1" /> Team</TabsTrigger>
          </TabsList>

          {/* ── SALES TAB ── */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Revenue', value: fmt(totalRevenue), change: revenueChange, icon: DollarSign },
                { label: 'Orders', value: orderCount, change: 0, icon: ShoppingBag },
                { label: 'AOV', value: fmt(aov), change: 0, icon: TrendingUp },
                { label: 'Customers', value: customers.filter(c => new Date(c.created_at) >= cutoffDate).length, change: 0, icon: Users },
              ].map((kpi, i) => (
                <div key={i} className="stat-card">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">{kpi.value}</p>
                  {kpi.change !== 0 && (
                    <div className={cn('flex items-center gap-1 text-xs', kpi.change >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                      {kpi.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {fmtPct(kpi.change)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sales Trend */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Sales Trend</h3>
                <Button variant="outline" size="sm" onClick={() => exportCSV(salesTrend, 'sales-trend.csv')}><Download className="w-3 h-3 mr-1" /> CSV</Button>
              </div>
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={fmtDateLabel} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => [fmt(v), 'Revenue']} labelFormatter={fmtDateLabel} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Store-wise */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Store-wise Revenue</h3>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(storePerf, 'store-revenue.csv')}><Download className="w-3 h-3 mr-1" /> CSV</Button>
                </div>
                <div className="space-y-3">
                  {storePerf.map((s, i) => {
                    const pct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-28 shrink-0 truncate">{s.name}</span>
                        <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right w-24 shrink-0">
                          <p className="text-sm font-semibold">{fmt(s.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{s.orders} orders</p>
                        </div>
                      </div>
                    );
                  })}
                  {storePerf.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
                </div>
              </div>

              {/* Channel-wise Pie */}
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Channel Split</h3>
                {channelPerf.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={channelPerf.map(c => ({ name: CHANNEL_CONFIG[c.channel as SalesChannel]?.label || c.channel, value: c.revenue }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {channelPerf.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── OPS TAB ── */}
          <TabsContent value="ops" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'SLA Hit Rate', value: `${slaRate.toFixed(1)}%`, icon: Target, color: slaRate >= 90 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Avg Pack Time', value: `${avgPackMin.toFixed(0)} min`, icon: Clock, color: 'text-primary' },
                { label: 'Cancellation Rate', value: `${cancelRate.toFixed(1)}%`, icon: XCircle, color: cancelRate > 10 ? 'text-destructive' : 'text-muted-foreground' },
                { label: 'RTOs', value: rtoCount, icon: Truck, color: rtoCount > 0 ? 'text-destructive' : 'text-emerald-600' },
              ].map((kpi, i) => (
                <div key={i} className="stat-card">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                  <p className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Fulfillment breakdown */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Fulfillment Status Breakdown</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {['new', 'accepted', 'picking', 'packed', 'in_transit', 'delivered', 'cancelled', 'rto'].map(status => {
                  const count = filteredOrders.filter(o => o.fulfillment_status === status).length;
                  return (
                    <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ── INVENTORY TAB ── */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total SKUs', value: totalSkus, icon: Package, color: 'text-primary' },
                { label: 'Avg Stock', value: avgStock.toFixed(0), icon: BarChart3, color: 'text-muted-foreground' },
                { label: 'Low Stock', value: lowStockItems.length, icon: AlertTriangle, color: lowStockItems.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Out of Stock', value: oosItems.length, icon: XCircle, color: oosItems.length > 0 ? 'text-destructive' : 'text-emerald-600' },
              ].map((kpi, i) => (
                <div key={i} className="stat-card">
                  <div className="flex items-center gap-2 mb-1"><kpi.icon className={cn('w-4 h-4', kpi.color)} /><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
                  <p className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <h3 className="font-semibold">Stock Alerts</h3>
                <Button variant="outline" size="sm" onClick={() => exportCSV(
                  [...oosItems, ...lowStockItems].map(i => ({ product: i.cigar?.name, quantity: i.quantity, min_level: i.min_stock_level })),
                  'stock-alerts.csv'
                )}><Download className="w-3 h-3 mr-1" /> CSV</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...oosItems, ...lowStockItems].map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{item.cigar?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.min_stock_level || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.quantity <= 0 ? 'destructive' : 'outline'} className="text-[10px]">
                          {item.quantity <= 0 ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {oosItems.length === 0 && lowStockItems.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">All stock levels healthy</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── TEAM TAB ── */}
          <TabsContent value="team" className="space-y-6">
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <h3 className="font-semibold">Team Productivity</h3>
                <Button variant="outline" size="sm" onClick={() => exportCSV(teamPerf, 'team-productivity.csv')}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cancellations</TableHead>
                    <TableHead>Error Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerf.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">{t.orders}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(t.revenue)}</TableCell>
                      <TableCell className="text-sm">{t.cancelled}</TableCell>
                      <TableCell>
                        <Badge variant={t.orders > 0 && (t.cancelled / t.orders) > 0.1 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {t.orders > 0 ? `${((t.cancelled / t.orders) * 100).toFixed(1)}%` : '0%'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {teamPerf.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No team activity in this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
