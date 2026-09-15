import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  Clock, Plus, X, ArrowUpDown, ExternalLink, Loader2,
  CheckCircle2, XCircle, PackageCheck, Truck, Timer, ChevronRight,
  User, MapPin, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  type SalesChannel,
  CHANNEL_CONFIG, FULFILLMENT_CONFIG,
  parseCSVOrders, type ChannelOrder, getSlaStatus,
} from '@/lib/channelConnectors';
import { PageLoading } from '@/components/ui/page-loading';

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
  { key: 'all', label: 'All orders', statuses: [] },
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

function getNextAction(order: OrderRow) {
  if (order.is_voided) return undefined;
  const stage = STATUS_TABS.find(tab => tab.statuses.includes(order.fulfillment_status));
  return stage ? NEXT_STATUS[stage.key] : undefined;
}

function getUrgencyScore(order: OrderRow): number {
  if (!getNextAction(order)) return 3;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const updatingRef = useRef(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<string>('all');

  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const [posMode, setPosMode] = useState(false);

  // Detail panel
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState(false);
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

  const storeId = currentStore?.id;
  const fetchSequence = useRef(0);
  const fetchOrders = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('orders')
        .select('id, order_number, invoice_number, status, channel, fulfillment_status, external_channel_order_number, is_finalized, is_voided, total, subtotal, tax, items_count, payment_type, payment_status, fulfillment_type, sla_deadline, created_at, created_by, store_id, notes, shipping_address, customers(name, phone), store:stores(name)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (storeId) query = query.eq('store_id', storeId);
      const { data, error } = await query;
      if (error) throw error;
      if (sequence === fetchSequence.current) {
        // Older demo rows use aliases that are not present in the channel/status filters.
        setOrders(((data as unknown as OrderRow[]) || []).map(order => ({
          ...order,
          channel: (order.channel as string) === 'walk_in' ? 'in_store' : order.channel,
          fulfillment_status: order.fulfillment_status === 'pending' ? 'new' : order.fulfillment_status,
        })));
      }
    } catch {
      if (sequence === fetchSequence.current) setLoadError('Orders could not be loaded. Please try again.');
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    setOrders([]);
    setSelectedId(null);
    setMobileDetailOpen(false);
    void fetchOrders();
    return () => { fetchSequence.current += 1; };
  }, [fetchOrders]);

  // Fetch items when selection changes
  useEffect(() => {
    let cancelled = false;
    setDetailItems([]);
    setItemsError(false);
    if (!selectedId) return;
    (async () => {
      setLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('id, quantity, unit_price, total_price, cigar:cigars(name), product:products(name)')
          .eq('order_id', selectedId);
        if (error) throw error;
        if (!cancelled) setDetailItems((data as unknown as OrderItem[]) || []);
      } catch {
        if (!cancelled) setItemsError(true);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const term = search.trim().toLowerCase();
      const matchSearch = !term ||
        o.order_number.toLowerCase().includes(term) ||
        o.customers?.name?.toLowerCase().includes(term) ||
        o.external_channel_order_number?.toLowerCase().includes(term);
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
      counts[tab.key] = tab.key === 'all' ? filtered.length : filtered.filter(o => tab.statuses.includes(o.fulfillment_status)).length;
    });
    return counts;
  }, [filtered]);

  // Queue for active tab
  const queue = useMemo(() => {
    const tab = STATUS_TABS.find(t => t.key === activeTab);
    if (!tab) return [];
    const items = filtered.filter(o => tab.key === 'all' || tab.statuses.includes(o.fulfillment_status));

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
    .filter(f => f !== 'all').length;
  const hasSearchOrFilters = activeFilterCount > 0 || search.trim().length > 0;

  const clearAllFilters = () => {
    setSearch(''); setChannelFilter('all'); setStatusFilter('all');
    setPaymentFilter('all'); setFulfillmentTypeFilter('all');
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // ─── Actions ───
  const updateStatus = async (orderId: string, newStatus: string, declinedReason?: string) => {
    if (updatingRef.current) return false;
    updatingRef.current = true;
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from('orders').update({ fulfillment_status: newStatus, ...(declinedReason !== undefined ? { declined_reason: declinedReason } : {}) }).eq('id', orderId);
      if (error) throw error;
      setOrders(current => current.map(order => order.id === orderId ? { ...order, fulfillment_status: newStatus } : order));
      toast.success(`Order moved to ${newStatus.replace(/_/g, ' ')}`);
      return true;
    } catch {
      toast.error('Failed to update order status');
      return false;
    } finally {
      updatingRef.current = false;
      setUpdatingId(null);
    }
  };

  const handleDecline = async () => {
    if (!selectedId) return;
    if (await updateStatus(selectedId, 'declined', declineReason)) {
      setDeclineDialogOpen(false);
      setDeclineReason('');
    }
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
    } catch (err: unknown) {
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setImporting(false); }
  };

  // ─── Detail Panel Content (shared desktop/mobile) ───
  const renderDetailPanel = () => {
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
    const sla = getSlaStatus(getNextAction(selectedOrder) ? selectedOrder.sla_deadline : null);
    const timelineIdx = getTimelineIndex(selectedOrder.fulfillment_status);
    const nextAction = getNextAction(selectedOrder);

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 break-words font-bold text-base">
                  {selectedOrder.external_channel_order_number || selectedOrder.order_number}
                </h3>
                <span className={cn('inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-medium', ffCfg.color)}>
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
                {getNextAction(selectedOrder) && selectedOrder.sla_deadline && (
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
                <div role="status" aria-label="Loading order items" className="h-16 rounded-lg animate-shimmer" />
              ) : itemsError ? (
                <p role="alert" className="text-sm text-destructive">Items could not be loaded. Reopen this order to retry.</p>
              ) : detailItems.length > 0 ? (
                <div className="space-y-1.5">
                  {detailItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words">{item.product?.name || item.cigar?.name || 'Unknown'}</p>
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
              <ol aria-label="Fulfillment progress" className="grid grid-cols-4 gap-x-2 gap-y-3">
                {TIMELINE_STEPS.map((step, i) => {
                  const done = i <= timelineIdx;
                  const active = i === timelineIdx;
                  return (
                    <li key={step.key} aria-current={active ? 'step' : undefined} className="min-w-0 space-y-2">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0 transition-colors',
                        done ? 'bg-primary' : 'bg-muted-foreground/20',
                        active && 'ring-2 ring-primary/30'
                      )} />
                      <span className={cn('block text-xs', done ? 'font-medium text-primary' : 'text-muted-foreground')}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
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
        </div>

        {/* Actions Footer */}
        <div className="shrink-0 border-t border-border bg-background p-3 space-y-2">
          {/* Primary action */}
          {nextAction && (
            <Button
              className="min-h-11 w-full gap-2"
              size="sm"
              disabled={updatingId !== null}
              onClick={() => updateStatus(selectedOrder.id, nextAction.status)}
            >
              {updatingId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <nextAction.icon className="w-4 h-4" />}
              {updatingId === selectedOrder.id ? 'Updating...' : nextAction.label}
            </Button>
          )}

          {/* Decline for new orders */}
          {nextAction?.status === 'accepted' && (
            <Button
              variant="outline"
              className="min-h-11 w-full gap-2 text-destructive hover:text-destructive"
              size="sm"
              disabled={updatingId !== null}
              onClick={() => setDeclineDialogOpen(true)}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
          )}

          {/* Full details link */}
          <Button
            variant="ghost"
            className="min-h-11 w-full gap-2 text-sm"
            size="sm"
            onClick={() => navigate(`/demo/orders/${selectedOrder.id}`)}
          >
            Open Full Details <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex min-w-0 flex-col pb-20 animate-fade-in md:h-[calc(100dvh-9rem)] md:min-h-[560px] md:pb-0">
        {/* ─── Header ─── */}
        <div className="mb-3 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[#17191c] md:text-3xl">Orders</h1>
              <p className="mt-1 text-xs text-muted-foreground">{orders.length} orders{currentStore ? ` · ${currentStore.name}` : ''}</p>
            </div>
            <Button className="min-h-11 shrink-0 gap-1.5" onClick={() => navigate('/demo/orders/new')}>
              <Plus className="h-4 w-4" /> New order
            </Button>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search orders"
                placeholder="Order number or customer"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-11 rounded-full bg-white pl-9 pr-11 text-base md:text-sm"
              />
              {search && <button type="button" aria-label="Clear search" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-primary" onClick={() => setSearch('')}><X className="h-4 w-4" /></button>}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-11 w-11 shrink-0" aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}>
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{activeFilterCount}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-4" align="end" collisionPadding={12}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Filters</span>
                    {activeFilterCount > 0 && <Button variant="ghost" className="min-h-11 text-xs" onClick={clearAllFilters}>Clear all</Button>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="order-channel">Channel</Label>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                      <SelectTrigger id="order-channel" className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All channels</SelectItem>
                        <SelectItem value="in_store">In-Store</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                        <SelectItem value="csv_import">CSV import</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="order-payment">Payment</Label>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger id="order-payment" className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All payments</SelectItem>
                        <SelectItem value="cod">COD</SelectItem>
                        <SelectItem value="prepaid">Prepaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="order-fulfillment">Fulfillment type</Label>
                    <Select value={fulfillmentTypeFilter} onValueChange={setFulfillmentTypeFilter}>
                      <SelectTrigger id="order-fulfillment" className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="self_ship">Self Ship</SelectItem>
                        <SelectItem value="marketplace_logistics">Marketplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={fetchOrders} disabled={loading} aria-label="Refresh orders">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant={posMode ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] gap-1.5"
              aria-pressed={posMode}
              onClick={() => setPosMode((next) => !next)}
            >
              <ShoppingCart className="w-4 h-4" />
              {posMode ? 'POS mode on' : 'POS mode'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            <Button variant="ghost" className="h-11 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
            {channelFilter !== 'all' && (
              <Button variant="secondary" className="min-h-11 gap-2 text-xs" aria-label="Remove channel filter" onClick={() => setChannelFilter('all')}>
                {CHANNEL_CONFIG[channelFilter as SalesChannel]?.label || channelFilter}
                <X className="h-3 w-3" />
              </Button>
            )}
            {paymentFilter !== 'all' && (
              <Button variant="secondary" className="min-h-11 gap-2 text-xs" aria-label="Remove payment filter" onClick={() => setPaymentFilter('all')}>
                {paymentFilter === 'cod' ? 'COD' : 'Prepaid'}
                <X className="h-3 w-3" />
              </Button>
            )}
            {fulfillmentTypeFilter !== 'all' && (
              <Button variant="secondary" className="min-h-11 gap-2 text-xs" aria-label="Remove fulfillment filter" onClick={() => setFulfillmentTypeFilter('all')}>
                {fulfillmentTypeFilter === 'self_ship' ? 'Self Ship' : 'Marketplace'}
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" className="min-h-11 text-xs" onClick={clearAllFilters}>Clear all</Button>
          </div>
        )}

        {/* ─── Status Tabs ─── */}
        <div className="mb-2 md:hidden">
          <Select value={activeTab} onValueChange={value => { setActiveTab(value); setSelectedId(null); }}>
            <SelectTrigger aria-label="Order status" className="h-11 bg-white font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_TABS.map(stage => <SelectItem key={stage.key} value={stage.key} className="min-h-11">{stage.label} ({tabCounts[stage.key] || 0})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div aria-label="Order status" className="mb-1 hidden shrink-0 items-center gap-1 overflow-x-auto pb-2 md:flex">
          {STATUS_TABS.map(tab => {
            const count = tabCounts[tab.key] || 0;
            const isActive = activeTab === tab.key;
            const tabOrders = filtered.filter(o => tab.statuses.includes(o.fulfillment_status));
            const hasUrgent = tabOrders.some(o => getUrgencyScore(o) <= 1);
            return (
              <button
                key={tab.key}
                aria-pressed={isActive}
                onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                  !isActive && hasUrgent && count > 0 && 'ring-1 ring-destructive/40 text-destructive'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
                    !isActive && hasUrgent && 'bg-destructive/10 text-destructive'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Queue Summary Bar ─── */}
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p role="status" className="text-sm font-medium text-foreground">
              {queue.length === 0
                ? 'No orders in view'
                : `${queue.length} order${queue.length === 1 ? '' : 's'}`}
            </p>
            {queue.length > 0 && (() => {
              const urgentCount = queue.filter(o => getUrgencyScore(o) <= 1).length;
              return urgentCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {urgentCount} urgent
                </span>
              ) : null;
            })()}
          </div>
          <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
            <SelectTrigger aria-label="Sort orders" className="h-11 w-auto gap-1 border-0 px-2 text-xs shadow-none">
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
        <div className="grid min-h-0 min-w-0 gap-3 md:flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Queue List */}
          <div aria-busy={loading} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
            {loadError ? (
              <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm">{loadError}</p>
                <Button variant="outline" className="min-h-11" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /> Retry</Button>
              </div>
            ) : loading && orders.length === 0 ? (
              <div className="flex-1 p-4">
                <PageLoading label="Loading order queue" rows={2} />
              </div>
            ) : queue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {hasSearchOrFilters ? 'No matching orders' : activeTab === 'all' ? 'No orders yet' : `No ${STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} orders`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{hasSearchOrFilters ? 'Try another search or clear your filters.' : 'New orders will appear here.'}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {hasSearchOrFilters && <Button variant="outline" className="min-h-11" onClick={clearAllFilters}>Clear filters</Button>}
                  {activeTab !== 'all' && <Button variant="outline" className="min-h-11" onClick={() => setActiveTab('all')}>View all orders</Button>}
                  {!hasSearchOrFilters && activeTab === 'all' && <Button className="min-h-11" onClick={() => navigate('/demo/orders/new')}><Plus className="h-4 w-4" /> New order</Button>}
                </div>
              </div>
            ) : (
              <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <div className="divide-y divide-border">
                  {queue.map(order => {
                    const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
                    const ChIcon = CHANNEL_ICONS[order.channel] || Package;
                    const sla = getSlaStatus(getNextAction(order) ? order.sla_deadline : null);
                    const urgency = getUrgencyScore(order);
                    const isSelected = order.id === selectedId;
                    const nextAction = getNextAction(order);
                    const ffCfg = FULFILLMENT_CONFIG[order.fulfillment_status];
                    const orderNumber = order.external_channel_order_number || order.order_number;

                    return (
                      <article
                        key={order.id}
                        className={cn(
                          'min-w-0 space-y-3',
                          posMode ? 'p-4' : 'p-3',
                          'border-l-[3px]',
                          isSelected
                            ? 'bg-primary/[0.06] border-l-primary'
                            : 'hover:bg-muted/50 border-l-transparent',
                          urgency === 0 && !isSelected && 'border-l-destructive bg-destructive/[0.04]',
                          urgency === 1 && !isSelected && 'border-l-warning bg-warning/[0.03]',
                        )}
                      >
                        <button type="button" aria-label={`View order ${orderNumber}`} aria-pressed={isSelected} onClick={() => selectOrder(order.id)} className="block w-full min-w-0 space-y-2 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="min-w-0 break-words font-mono text-sm font-semibold">{orderNumber}</span>
                            <span className="shrink-0 text-base font-semibold tabular-nums">{formatCurrency(Number(order.total))}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 break-words">{order.customers?.name || 'Walk-in'}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', chCfg.color)}><ChIcon className="h-3 w-3" />{chCfg.label}</span>
                            <span className={cn('rounded-full px-2 py-1', ffCfg?.color || 'bg-muted text-muted-foreground')}>{order.is_voided ? 'Voided' : ffCfg?.label || order.fulfillment_status?.replace(/_/g, ' ') || 'Unfulfilled'}</span>
                            <span className="text-muted-foreground">{order.payment_type === 'cod' ? 'COD' : 'Prepaid'}</span>
                          </div>
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.04] pt-2">
                          <span className={cn('flex items-center gap-1 text-xs', nextAction && urgency <= 1 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                            <Clock className="h-3.5 w-3.5" /> {nextAction && order.sla_deadline ? sla.label : timeAgo(order.created_at)}
                          </span>
                          {nextAction ? (
                          <Button
                            size="sm"
                            className={cn('min-h-11 gap-2 px-4 text-xs font-semibold', posMode && 'min-h-12 w-full text-sm')}
                            disabled={updatingId !== null}
                            onClick={() => updateStatus(order.id, nextAction.status)}
                          >
                            {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <nextAction.icon className="h-4 w-4" />}
                            {updatingId === order.id ? 'Updating...' : nextAction.label}
                          </Button>
                          ) : <Button variant="outline" className="min-h-11 text-xs" onClick={() => selectOrder(order.id)}>View details <ChevronRight className="h-4 w-4" /></Button>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel (Desktop only) */}
          {!isMobile && (
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
              {renderDetailPanel()}
            </div>
          )}
        </div>

        {/* Mobile Detail Sheet */}
        {isMobile && (
          <Sheet open={mobileDetailOpen} onOpenChange={open => { setMobileDetailOpen(open); if (!open) setSelectedId(null); }}>
            <SheetContent side="bottom" className="flex h-[min(42rem,85dvh)] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 [&>button]:h-11 [&>button]:w-11">
              <SheetHeader className="shrink-0 border-b px-4 py-4 pr-16 text-left">
                <SheetTitle className="text-base">Order Details</SheetTitle>
                <SheetDescription className="sr-only">Review the selected order and update its fulfillment status.</SheetDescription>
              </SheetHeader>
              {renderDetailPanel()}
            </SheetContent>
          </Sheet>
        )}

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Decline Order</DialogTitle><DialogDescription>This order will move to Issues. You can add a reason below.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="decline-reason" className="text-xs">Reason (optional)</Label>
              <Input id="decline-reason" value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Out of stock, etc." className="h-11 text-base" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="min-h-11" disabled={updatingId !== null} onClick={() => setDeclineDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="min-h-11" disabled={updatingId !== null} onClick={handleDecline}>{updatingId ? 'Declining...' : 'Decline Order'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={showCSVDialog} onOpenChange={setShowCSVDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Import Orders from CSV</DialogTitle><DialogDescription>Review the import before adding orders to the queue.</DialogDescription></DialogHeader>
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
