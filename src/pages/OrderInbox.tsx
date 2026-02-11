import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Inbox, Search, Filter, RefreshCw, Eye, Upload, Store, Globe, Instagram,
  MessageCircle, ShoppingCart, FileSpreadsheet, Package, ChevronDown, X, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  type SalesChannel, type FulfillmentStatus,
  CHANNEL_CONFIG, FULFILLMENT_CONFIG,
  parseCSVOrders, allConnectors, type ChannelOrder,
} from '@/lib/channelConnectors';

interface OrderRow {
  id: string;
  order_number: string;
  invoice_number: string | null;
  status: string;
  channel: SalesChannel;
  fulfillment_status: FulfillmentStatus;
  external_channel_order_number: string | null;
  is_finalized: boolean;
  is_voided: boolean;
  total: number;
  created_at: string;
  created_by: string;
  customers: { name: string } | null;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store,
  website: Globe,
  instagram: Instagram,
  whatsapp: MessageCircle,
  marketplace: ShoppingCart,
  csv_import: FileSpreadsheet,
};

export default function OrderInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // CSV import state
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvPreview, setCSVPreview] = useState<ChannelOrder[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, invoice_number, status, channel, fulfillment_status, external_channel_order_number, is_finalized, is_voided, total, created_at, created_by, customers(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    setOrders((data as OrderRow[]) || []);
    setLoading(false);
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.external_channel_order_number?.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
    const matchFulfillment = fulfillmentFilter === 'all' || o.fulfillment_status === fulfillmentFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchChannel && matchFulfillment && matchStatus;
  });

  // Channel stats
  const channelCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.channel] = (acc[o.channel] || 0) + 1;
    return acc;
  }, {});

  const fulfillmentCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.fulfillment_status] = (acc[o.fulfillment_status] || 0) + 1;
    return acc;
  }, {});

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // CSV Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSVOrders(text);
      setCSVPreview(result.orders);
      setCsvErrors(result.errors);
      setShowCSVDialog(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportCSV = async () => {
    if (csvPreview.length === 0) return;
    setImporting(true);
    try {
      // Get first store
      const { data: stores } = await supabase.from('stores').select('id').limit(1);
      const storeId = stores?.[0]?.id || null;

      for (const order of csvPreview) {
        // Find or create customer
        let customerId: string | null = null;
        if (order.customer_phone) {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', order.customer_phone)
            .maybeSingle();
          if (existing) {
            customerId = existing.id;
          } else {
            const { data: newCust } = await supabase
              .from('customers')
              .insert({ name: order.customer_name, phone: order.customer_phone, email: order.customer_email || null, created_by: user!.id })
              .select('id')
              .single();
            customerId = newCust?.id || null;
          }
        }

        const { error } = await supabase.from('orders').insert({
          created_by: user!.id,
          customer_id: customerId,
          store_id: storeId,
          subtotal: order.subtotal,
          total: order.total,
          tax: 0,
          status: 'created' as const,
          channel: 'csv_import',
          fulfillment_status: 'unfulfilled',
          external_order_id: order.external_order_id,
          external_channel_order_number: order.external_channel_order_number,
          notes: order.notes || null,
          shipping_address: order.shipping_address || null,
          order_number: 'PENDING',
        });

        if (error) throw error;
      }

      toast.success(`Imported ${csvPreview.length} orders`);
      setShowCSVDialog(false);
      setCSVPreview([]);
      setCsvErrors([]);
      fetchOrders();
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display">Order Inbox</h1>
            <p className="text-muted-foreground text-sm mt-1">Unified view of orders across all channels</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Channel Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChannelFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              channelFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
            )}
          >
            All Channels ({orders.length})
          </button>
          {(Object.keys(CHANNEL_CONFIG) as SalesChannel[]).map(ch => {
            const cfg = CHANNEL_CONFIG[ch];
            const count = channelCounts[ch] || 0;
            const Icon = CHANNEL_ICONS[ch] || Package;
            return (
              <button
                key={ch}
                onClick={() => setChannelFilter(channelFilter === ch ? 'all' : ch)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5',
                  channelFilter === ch ? 'bg-primary text-primary-foreground border-primary' : `bg-card border-border ${cfg.color} hover:bg-muted`
                )}
              >
                <Icon className="w-3 h-3" />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Fulfillment Status Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFulfillmentFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              fulfillmentFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
            )}
          >
            All Fulfillment
          </button>
          {(Object.keys(FULFILLMENT_CONFIG) as FulfillmentStatus[]).map(fs => {
            const cfg = FULFILLMENT_CONFIG[fs];
            const count = fulfillmentCounts[fs] || 0;
            return (
              <button
                key={fs}
                onClick={() => setFulfillmentFilter(fulfillmentFilter === fs ? 'all' : fs)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  fulfillmentFilter === fs ? 'bg-primary text-primary-foreground border-primary' : `bg-card border-border ${cfg.color} hover:bg-muted`
                )}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Order #, customer, external ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Order Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => { setSearch(''); setChannelFilter('all'); setFulfillmentFilter('all'); setStatusFilter('all'); }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">{filtered.length} Orders</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold">No orders found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or import orders via CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Channel</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fulfillment</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
                    const ffCfg = FULFILLMENT_CONFIG[order.fulfillment_status] || FULFILLMENT_CONFIG.unfulfilled;
                    const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                    return (
                      <tr
                        key={order.id}
                        className="table-row-hover border-t border-border cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="p-4">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', chCfg.color)}>
                            <ChIcon className="w-3 h-3" />
                            {chCfg.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{order.external_channel_order_number || order.invoice_number || order.order_number}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">{order.customers?.name || 'N/A'}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="p-4">
                          <span className={cn('status-badge capitalize', order.is_voided && 'opacity-50')}>
                            {order.is_voided ? 'Voided' : order.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', ffCfg.color)}>
                            {ffCfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(Number(order.total))}</td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Connectors (coming soon) */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Channel Connectors</h3>
          <p className="text-sm text-muted-foreground mb-4">Connect external sales channels to automatically sync orders.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allConnectors.map(c => {
              const Icon = CHANNEL_ICONS[c.id] || Package;
              return (
                <div key={c.id} className="border border-border rounded-lg p-4 flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={showCSVDialog} onOpenChange={setShowCSVDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Orders from CSV</DialogTitle>
          </DialogHeader>
          {csvErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                {csvErrors.length} warning(s)
              </div>
              <ul className="text-xs text-destructive/80 list-disc pl-5 space-y-0.5">
                {csvErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {csvErrors.length > 5 && <li>...and {csvErrors.length - 5} more</li>}
              </ul>
            </div>
          )}
          {csvPreview.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{csvPreview.length} order(s) ready to import</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Ext. Order #</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((o, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3 font-medium">{o.external_channel_order_number}</td>
                        <td className="p-3 text-muted-foreground">{o.customer_name}</td>
                        <td className="p-3 text-center">{o.items.length}</td>
                        <td className="p-3 text-right font-semibold">₹{o.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowCSVDialog(false); setCSVPreview([]); setCsvErrors([]); }}>
                  Cancel
                </Button>
                <Button onClick={handleImportCSV} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${csvPreview.length} Orders`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No valid orders found in CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: customer_name, product_name, quantity, unit_price
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
