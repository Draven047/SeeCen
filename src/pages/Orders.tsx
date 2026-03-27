import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Inbox, Search, Filter, RefreshCw, Upload, Store, Globe, Instagram,
  MessageCircle, ShoppingCart, FileSpreadsheet, Package, AlertTriangle,
  Clock, CreditCard, Plus, X, ArrowUpDown, ExternalLink,
  CheckCircle2, XCircle, PackageCheck, Truck, Timer, ChevronRight,
  User, MapPin, FileText, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  type SalesChannel,
  CHANNEL_CONFIG, FULFILLMENT_CONFIG,
  parseCSVOrders, type ChannelOrder, getSlaStatus,
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
  subtotal: number;
  tax: number;
  items_count: number;
  payment_type: string;
  payment_status: string;
  fulfillment_type: string;
  sla_deadline: string | null;
  created_at: string;
  created_by: string;
  store_id: string | null;
  notes: string | null;
  shipping_address: string | null;
  customers: { name: string; phone?: string } | null;
  store: { name: string } | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cigar: { name: string } | null;
  product: { name: string } | null;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store, website: Globe, instagram: Instagram,
  whatsapp: MessageCircle, marketplace: ShoppingCart, csv_import: FileSpreadsheet,
};

// ─── Status Tabs ───
const STATUS_TABS = [
  { key: 'new_orders', label: 'New', statuses: ['new', 'unfulfilled'] },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { key: 'picking', label: 'Picking', statuses: ['picking'] },
  { key: 'packed', label: 'Packed', statuses: ['packed'] },
  { key: 'ready', label: 'Ready', statuses: ['ready'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['pickup_scheduled', 'handover'] },
  { key: 'in_transit', label: 'In Transit', statuses: ['in_transit'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered', 'fulfilled'] },
  { key: 'issues', label: 'Issues', statuses: ['declined', 'cancelled', 'failed_delivery', 'rto', 'returned', 'partial_fulfilled', 'partially_fulfilled'] },
];

const NEXT_STATUS: Record<string, { label: string; status: string; icon: React.ElementType }> = {
  new_orders: { label: 'Accept', status: 'accepted', icon: CheckCircle2 },
  accepted: { label: 'Start Picking', status: 'picking', icon: Package },
  picking: { label: 'Mark Packed', status: 'packed', icon: PackageCheck },
  packed: { label: 'Ready for Pickup', status: 'ready', icon: Truck },
  ready: { label: 'Hand to Courier', status: 'pickup_scheduled', icon: Truck },
  scheduled: { label: 'In Transit', status: 'in_transit', icon: Truck },
  in_transit: { label: 'Mark Delivered', status: 'delivered', icon: CheckCircle2 },
};

type SortMode = 'urgency' | 'newest' | 'oldest' | 'highest';

function getUrgencyScore(order: OrderRow): number {
  if (!order.sla_deadline) return 3;
  const diff = new Date(order.sla_deadline).getTime() - Date.now();
  if (diff < 0) return 0; // breached
  if (diff < 30 * 60 * 1000) return 1; // <30min
  if (diff < 2 * 60 * 60 * 1000) return 2; // <2h
  return 3;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Timeline Steps ───
const TIMELINE_STEPS = [
  { key: 'new', label: 'Created' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picking', label: 'Picking' },
  { key: 'packed', label: 'Packed' },
  { key: 'ready', label: 'Ready' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

function getTimelineIndex(status: string): number {
  const map: Record<string, number> = {
    new: 0, unfulfilled: 0, accepted: 1, picking: 2, packed: 3,
    ready: 4, pickup_scheduled: 4, handover: 4, in_transit: 5,
    delivered: 6, fulfilled: 6,
  };
  return map[status] ?? -1;
}

export default function Orders() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<string>('all');

  const [activeTab, setActiveTab] = useState('new_orders');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('urgency');

  // Detail panel
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Action dialogs
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // CSV import
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
      .select('id, order_number, invoice_number, status, channel, fulfillment_status, external_channel_order_number, is_finalized, is_voided, total, subtotal, tax, items_count, payment_type, payment_status, fulfillment_type, sla_deadline, created_at, created_by, store_id, notes, shipping_address, customers(name, phone), store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (currentStore) query = query.eq('store_id', currentStore.id);
    const { data } = await query;
    setOrders((data as unknown as OrderRow[]) || []);
    setLoading(false);
  };

  // Fetch items when selection changes
  useEffect(() => {
    if (!selectedId) { setDetailItems([]); return; }
    (async () => {
      setLoadingItems(true);
      const { data } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, total_price, cigar:cigars(name), product:products(name)')
        .eq('order_id', selectedId);
      setDetailItems((data as unknown as OrderItem[]) || []);
      setLoadingItems(false);
    })();
  }, [selectedId]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !search ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.external_channel_order_number?.toLowerCase().includes(search.toLowerCase());
      const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchPayment = paymentFilter === 'all' || o.payment_type === paymentFilter;
      const matchFType = fulfillmentTypeFilter === 'all' || o.fulfillment_type === fulfillmentTypeFilter;
      return matchSearch && matchChannel && matchStatus && matchPayment && matchFType;
    });
  }, [orders, search, channelFilter, statusFilter, paymentFilter, fulfillmentTypeFilter]);

  // Count per tab
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_TABS.forEach(tab => {
      counts[tab.key] = filtered.filter(o => tab.statuses.includes(o.fulfillment_status)).length;
    });
    return counts;
  }, [filtered]);

  // Queue for active tab
  const queue = useMemo(() => {
    const tab = STATUS_TABS.find(t => t.key === activeTab);
    if (!tab) return [];
    let items = filtered.filter(o => tab.statuses.includes(o.fulfillment_status));

    // Sort
    if (sortMode === 'urgency') {
      items.sort((a, b) => {
        const ua = getUrgencyScore(a), ub = getUrgencyScore(b);
        if (ua !== ub) return ua - ub;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortMode === 'newest') {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === 'oldest') {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortMode === 'highest') {
      items.sort((a, b) => Number(b.total) - Number(a.total));
    }
    return items;
  }, [filtered, activeTab, sortMode]);

  const selectedOrder = selectedId ? orders.find(o => o.id === selectedId) : null;

  const activeFilterCount = [channelFilter, statusFilter, paymentFilter, fulfillmentTypeFilter]
    .filter(f => f !== 'all').length + (search ? 1 : 0);

  const clearAllFilters = () => {
    setSearch(''); setChannelFilter('all'); setStatusFilter('all');
    setPaymentFilter('all'); setFulfillmentTypeFilter('all');
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // ─── Actions ───
  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ fulfillment_status: newStatus })
      .eq('id', orderId);
    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success(`Order moved to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    }
  };

  const handleDecline = async () => {
    if (!selectedId) return;
    const { error } = await supabase
      .from('orders')
      .update({ fulfillment_status: 'declined', declined_reason: declineReason })
      .eq('id', selectedId);
    if (error) toast.error('Failed to decline order');
    else { toast.success('Order declined'); setDeclineDialogOpen(false); setDeclineReason(''); fetchOrders(); }
  };

  const selectOrder = (id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileDetailOpen(true);
  };

  // CSV Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCSVOrders(ev.target?.result as string);
      setCSVPreview(result.orders); setCsvErrors(result.errors); setShowCSVDialog(true);
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
          if (existing) customerId = existing.id;
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

  // ─── Detail Panel Content (shared desktop/mobile) ───
  const DetailPanelContent = () => {
    if (!selectedOrder) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
          <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select an order to view details</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click any order from the queue</p>
        </div>
      );
    }

    const chCfg = CHANNEL_CONFIG[selectedOrder.channel] || CHANNEL_CONFIG.in_store;
    const ffCfg = FULFILLMENT_CONFIG[selectedOrder.fulfillment_status] || FULFILLMENT_CONFIG.new;
    const ChIcon = CHANNEL_ICONS[selectedOrder.channel] || Package;
    const sla = getSlaStatus(selectedOrder.sla_deadline);
    const timelineIdx = getTimelineIndex(selectedOrder.fulfillment_status);
    const nextAction = NEXT_STATUS[activeTab];
    const isIssue = activeTab === 'issues';

    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">
                  {selectedOrder.external_channel_order_number || selectedOrder.order_number}
                </h3>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', ffCfg.color)}>
                  {ffCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium', chCfg.color)}>
                  <ChIcon className="w-2.5 h-2.5" /> {chCfg.label}
                </span>
                <Badge variant={selectedOrder.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[10px] px-1.5">
                  {selectedOrder.payment_type === 'cod' ? 'COD' : 'Prepaid'}
                </Badge>
                {sla.label !== '-' && (
                  <span className={cn('text-[10px] font-medium flex items-center gap-0.5', sla.color)}>
                    {sla.urgent && <AlertTriangle className="w-2.5 h-2.5" />}
                    {sla.label}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(selectedOrder.created_at)}</span>
              </div>
            </div>

            <Separator />

            {/* Customer */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" /> Customer
              </h4>
              <p className="text-sm font-medium">{selectedOrder.customers?.name || 'Walk-in'}</p>
              {selectedOrder.customers?.phone && (
                <p className="text-xs text-muted-foreground">{selectedOrder.customers.phone}</p>
              )}
              {selectedOrder.shipping_address && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  {selectedOrder.shipping_address}
                </p>
              )}
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Items ({selectedOrder.items_count})
              </h4>
              {loadingItems ? (
                <div className="py-4 flex justify-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detailItems.length > 0 ? (
                <div className="space-y-1.5">
                  {detailItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product?.name || item.cigar?.name || 'Unknown'}</p>
                        <p className="text-[11px] text-muted-foreground">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                      </div>
                      <span className="font-medium text-sm shrink-0 ml-2">{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No items loaded</p>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(selectedOrder.subtotal || 0))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(Number(selectedOrder.tax || 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(Number(selectedOrder.total))}</span>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Timer className="w-3 h-3" /> Progress
              </h4>
              <div className="flex items-center gap-0.5">
                {TIMELINE_STEPS.map((step, i) => {
                  const done = i <= timelineIdx;
                  const active = i === timelineIdx;
                  return (
                    <div key={step.key} className="flex items-center gap-0.5 flex-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0 transition-colors',
                        done ? 'bg-primary' : 'bg-muted-foreground/20',
                        active && 'ring-2 ring-primary/30'
                      )} />
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-primary' : 'bg-muted-foreground/20')} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between">
                {TIMELINE_STEPS.map((step, i) => (
                  <span key={step.key} className={cn(
                    'text-[8px] text-center flex-1',
                    i <= timelineIdx ? 'text-primary font-medium' : 'text-muted-foreground/50'
                  )}>{step.label}</span>
                ))}
              </div>
            </div>

            {selectedOrder.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Notes
                  </h4>
                  <p className="text-xs text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        <div className="border-t border-border p-3 space-y-2 bg-background">
          {/* Primary action */}
          {nextAction && !isIssue && (
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={() => updateStatus(selectedOrder.id, nextAction.status)}
            >
              <nextAction.icon className="w-4 h-4" />
              {nextAction.label}
            </Button>
          )}

          {/* Decline for new orders */}
          {activeTab === 'new_orders' && (
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:text-destructive"
              size="sm"
              onClick={() => setDeclineDialogOpen(true)}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
          )}

          {/* Full details link */}
          <Button
            variant="ghost"
            className="w-full gap-2 text-xs"
            size="sm"
            onClick={() => navigate(`/orders/${selectedOrder.id}`)}
          >
            Open Full Details <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-bold">Orders</h1>
            <p className="text-muted-foreground text-xs">{filtered.length} orders</p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Search (desktop inline) */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-48"
              />
            </div>

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
                      <button onClick={clearAllFilters} className="text-[10px] text-primary hover:underline">Clear all</button>
                    )}
                  </div>
                  {/* Mobile search */}
                  <div className="sm:hidden space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input placeholder="Order #, customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7 h-8 text-xs" />
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
                </div>
              </PopoverContent>
            </Popover>

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
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
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
            <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-foreground">Clear all</button>
          </div>
        )}

        {/* ─── Status Tabs ─── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none -mx-1 px-1">
          {STATUS_TABS.map(tab => {
            const count = tabCounts[tab.key] || 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Sort bar ─── */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{queue.length} order{queue.length !== 1 ? 's' : ''}</p>
          <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0 shadow-none px-2">
              <ArrowUpDown className="w-3 h-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="highest">Highest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ─── Main Content: Queue + Detail ─── */}
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
          {/* Queue List */}
          <div className={cn(
            'flex-1 min-w-0 rounded-lg border bg-card overflow-hidden flex flex-col',
            !isMobile && selectedOrder && 'max-w-[55%]'
          )}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : queue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No {STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} orders
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here when available</p>
                <Button variant="outline" size="sm" className="mt-4 text-xs gap-1.5" onClick={fetchOrders}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {queue.map(order => {
                    const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
                    const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                    const sla = getSlaStatus(order.sla_deadline);
                    const urgency = getUrgencyScore(order);
                    const isSelected = order.id === selectedId;
                    const nextAction = NEXT_STATUS[activeTab];

                    return (
                      <div
                        key={order.id}
                        onClick={() => selectOrder(order.id)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group',
                          isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40 border-l-2 border-l-transparent',
                          urgency === 0 && 'border-l-destructive bg-destructive/5',
                          urgency === 1 && !isSelected && 'border-l-warning'
                        )}
                      >
                        {/* Left info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-semibold text-sm truncate">
                              {order.external_channel_order_number || order.order_number}
                            </span>
                            <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0', chCfg.color)}>
                              <ChIcon className="w-2.5 h-2.5" /> {chCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{order.customers?.name || 'Walk-in'}</span>
                            <span>•</span>
                            <span className="shrink-0">{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Center: amount + payment */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">{formatCurrency(Number(order.total))}</p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Badge variant={order.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[9px] px-1 py-0 h-4">
                              {order.payment_type === 'cod' ? 'COD' : 'Prepaid'}
                            </Badge>
                          </div>
                        </div>

                        {/* Right: SLA + time */}
                        <div className="text-right shrink-0 w-16">
                          {sla.label !== '-' ? (
                            <span className={cn('text-[10px] font-medium flex items-center gap-0.5 justify-end', sla.color)}>
                              {sla.urgent && <Clock className="w-2.5 h-2.5" />}
                              {sla.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{timeAgo(order.created_at)}</span>
                          )}

                          {/* Quick action on desktop hover */}
                          {!isMobile && nextAction && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[9px] px-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                              onClick={e => { e.stopPropagation(); updateStatus(order.id, nextAction.status); }}
                            >
                              {nextAction.label} →
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Detail Panel (Desktop only) */}
          {!isMobile && (
            <div className={cn(
              'rounded-lg border bg-card overflow-hidden flex flex-col transition-all',
              selectedOrder ? 'w-[45%] min-w-[340px]' : 'w-[340px]'
            )}>
              <DetailPanelContent />
            </div>
          )}
        </div>

        {/* Mobile Detail Sheet */}
        {isMobile && (
          <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
            <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
              <SheetHeader className="px-4 pt-4 pb-0">
                <SheetTitle className="text-base">Order Details</SheetTitle>
              </SheetHeader>
              <DetailPanelContent />
            </SheetContent>
          </Sheet>
        )}

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Decline Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Out of stock, etc." className="text-sm" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeclineDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={handleDecline}>Decline Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
