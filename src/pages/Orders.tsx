import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  Inbox, Search, Filter, RefreshCw, Eye, Upload, Store, Globe, Instagram,
  MessageCircle, ShoppingCart, FileSpreadsheet, Package, AlertTriangle,
  Clock, CreditCard, Truck, Plus, List, Columns, X
} from 'lucide-react';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  type SalesChannel,
  CHANNEL_CONFIG, FULFILLMENT_CONFIG,
  parseCSVOrders, allConnectors, type ChannelOrder, getSlaStatus,
} from '@/lib/channelConnectors';

interface OrderRow {
  id: string;
  order_number: string;
  invoice_number: string | null;
  status: string;
  channel: SalesChannel;
  fulfillment_status: string;
  external_channel_order_number: string | null;
  is_finalized: boolean;
  is_voided: boolean;
  total: number;
  items_count: number;
  payment_type: string;
  fulfillment_type: string;
  sla_deadline: string | null;
  created_at: string;
  created_by: string;
  store_id: string | null;
  customers: { name: string } | null;
  store: { name: string } | null;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store, website: Globe, instagram: Instagram,
  whatsapp: MessageCircle, marketplace: ShoppingCart, csv_import: FileSpreadsheet,
};

export default function Orders() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<string>('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  // CSV import state
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvPreview, setCSVPreview] = useState<ChannelOrder[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchOrders(); }, [currentStore]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, order_number, invoice_number, status, channel, fulfillment_status, external_channel_order_number, is_finalized, is_voided, total, items_count, payment_type, fulfillment_type, sla_deadline, created_at, created_by, store_id, customers(name), store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (currentStore) {
      query = query.eq('store_id', currentStore.id);
    }

    const { data } = await query;
    setOrders((data as unknown as OrderRow[]) || []);
    setLoading(false);
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.external_channel_order_number?.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || o.payment_type === paymentFilter;
    const matchFType = fulfillmentTypeFilter === 'all' || o.fulfillment_type === fulfillmentTypeFilter;
    const matchFStatus = fulfillmentStatusFilter === 'all' || o.fulfillment_status === fulfillmentStatusFilter;
    return matchSearch && matchChannel && matchStatus && matchPayment && matchFType && matchFStatus;
  });

  const activeFilterCount = [channelFilter, statusFilter, paymentFilter, fulfillmentTypeFilter, fulfillmentStatusFilter]
    .filter(f => f !== 'all').length + (search ? 1 : 0);

  const clearAllFilters = () => {
    setSearch(''); setChannelFilter('all'); setStatusFilter('all');
    setPaymentFilter('all'); setFulfillmentTypeFilter('all'); setFulfillmentStatusFilter('all');
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  // CSV Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCSVOrders(ev.target?.result as string);
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
      const storeId = currentStore?.id || null;
      for (const order of csvPreview) {
        let customerId: string | null = null;
        if (order.customer_phone) {
          const { data: existing } = await supabase.from('customers').select('id').eq('phone', order.customer_phone).maybeSingle();
          if (existing) { customerId = existing.id; }
          else {
            const { data: newCust } = await supabase.from('customers').insert({ name: order.customer_name, phone: order.customer_phone, email: order.customer_email || null, created_by: user!.id }).select('id').single();
            customerId = newCust?.id || null;
          }
        }
        await supabase.from('orders').insert({
          created_by: user!.id, customer_id: customerId, store_id: storeId,
          subtotal: order.subtotal, total: order.total, tax: 0,
          status: 'created' as const, channel: 'csv_import',
          fulfillment_status: 'new', external_order_id: order.external_order_id,
          external_channel_order_number: order.external_channel_order_number,
          notes: order.notes || null, shipping_address: order.shipping_address || null,
          order_number: 'PENDING', items_count: order.items.reduce((s, i) => s + i.quantity, 0),
        });
      }
      toast.success(`Imported ${csvPreview.length} orders`);
      setShowCSVDialog(false); setCSVPreview([]); setCsvErrors([]);
      fetchOrders();
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally { setImporting(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Orders</h1>
            <p className="text-muted-foreground text-xs">
              {filtered.length} orders
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Filters</span>
                    {activeFilterCount > 0 && (
                      <button onClick={clearAllFilters} className="text-[10px] text-primary hover:underline">
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input placeholder="Order #, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Channel</Label>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        <SelectItem value="in_store">In-Store</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="created">Created</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Payment</Label>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="cod">COD</SelectItem>
                        <SelectItem value="prepaid">Prepaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Fulfillment Type</Label>
                    <Select value={fulfillmentTypeFilter} onValueChange={setFulfillmentTypeFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="self_ship">Self Ship</SelectItem>
                        <SelectItem value="marketplace_logistics">Marketplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Fulfillment Status</Label>
                    <Select value={fulfillmentStatusFilter} onValueChange={setFulfillmentStatusFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="picking">Picking</SelectItem>
                        <SelectItem value="packed">Packed</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* View toggle */}
            <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn('px-2 py-1.5 text-xs flex items-center gap-1 transition-colors',
                  viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn('px-2 py-1.5 text-xs flex items-center gap-1 transition-colors',
                  viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchOrders}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" />
            </Button>

            <Button size="sm" className="h-8 hidden sm:flex gap-1 text-xs" onClick={() => navigate('/orders/new')}>
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {search && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                Search: {search}
                <button onClick={() => setSearch('')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            {channelFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                {CHANNEL_CONFIG[channelFilter as SalesChannel]?.label || channelFilter}
                <button onClick={() => setChannelFilter('all')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1 capitalize">
                {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            {paymentFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                {paymentFilter === 'cod' ? 'COD' : 'Prepaid'}
                <button onClick={() => setPaymentFilter('all')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            {fulfillmentTypeFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                {fulfillmentTypeFilter === 'self_ship' ? 'Self Ship' : 'Marketplace'}
                <button onClick={() => setFulfillmentTypeFilter('all')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            {fulfillmentStatusFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] gap-1 pr-1 capitalize">
                {fulfillmentStatusFilter.replace(/_/g, ' ')}
                <button onClick={() => setFulfillmentStatusFilter('all')} className="hover:bg-muted rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            )}
            <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' ? (
          <OrderKanbanBoard orders={filtered} onRefresh={fetchOrders} />
        ) : (
        <>
        {/* Orders — Desktop Table / Mobile Cards */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold">No orders found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(order => {
                  const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
                  const ffCfg = FULFILLMENT_CONFIG[order.fulfillment_status] || FULFILLMENT_CONFIG.new;
                  const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                  const sla = getSlaStatus(order.sla_deadline);

                  return (
                    <div key={order.id} className="p-4 active:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{order.external_channel_order_number || order.order_number}</span>
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0', chCfg.color)}>
                              <ChIcon className="w-2.5 h-2.5" /> {chCfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{order.customers?.name || 'Walk-in'} • {formatDate(order.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{formatCurrency(Number(order.total))}</p>
                          <Badge variant={order.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[10px] px-1.5 mt-1">
                            {order.payment_type === 'cod' ? 'COD' : 'Prepaid'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', ffCfg.color)}>
                          {ffCfg.label}
                        </span>
                        {sla.label !== '-' && (
                          <span className={cn('text-[10px] font-medium flex items-center gap-0.5', sla.color)}>
                            {sla.urgent && <Clock className="w-2.5 h-2.5" />}
                            {sla.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Channel</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Order</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">SLA</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Items</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Payment</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Ship</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => {
                      const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
                      const ffCfg = FULFILLMENT_CONFIG[order.fulfillment_status] || FULFILLMENT_CONFIG.new;
                      const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                      const sla = getSlaStatus(order.sla_deadline);

                      return (
                        <tr key={order.id} className="border-t border-border cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/orders/${order.id}`)}>
                          <td className="p-3">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', chCfg.color)}>
                              <ChIcon className="w-3 h-3" /> {chCfg.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div>
                              <span className="font-medium text-sm">{order.external_channel_order_number || order.order_number}</span>
                              <p className="text-xs text-muted-foreground">{order.customers?.name || 'Walk-in'} • {formatDate(order.created_at)}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={cn('text-xs font-medium flex items-center gap-1', sla.color)}>
                              {sla.urgent && <Clock className="w-3 h-3" />}
                              {sla.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-sm">{order.items_count || '-'}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-semibold text-sm">{formatCurrency(Number(order.total))}</span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={order.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[10px] px-1.5">
                              {order.payment_type === 'cod' ? 'COD' : 'Prepaid'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {order.fulfillment_type === 'marketplace_logistics' ? 'Mkt' : 'Self'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', ffCfg.color)}>
                              {ffCfg.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </>
        )}

        {/* CSV Import Dialog */}
        <Dialog open={showCSVDialog} onOpenChange={setShowCSVDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Import Orders from CSV</DialogTitle></DialogHeader>
            {csvErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive">Errors:</p>
                {csvErrors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{csvPreview.length} orders ready to import</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCSVDialog(false)}>Cancel</Button>
              <Button onClick={handleImportCSV} disabled={importing || csvPreview.length === 0}>
                {importing ? 'Importing...' : `Import ${csvPreview.length} Orders`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
