import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import { Package, Clock, CheckCircle, AlertTriangle, Truck, Search, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CHANNEL_CONFIG, FULFILLMENT_CONFIG, getSlaStatus, type SalesChannel } from '@/lib/channelConnectors';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';

interface FulfillmentOrder {
  id: string;
  order_number: string;
  fulfillment_status: string;
  fulfillment_type: string;
  payment_type: string;
  channel: string;
  sla_deadline: string | null;
  items_count: number;
  total: number;
  created_at: string;
  store_id: string | null;
  customers: { name: string } | null;
  items?: { id: string; quantity: number; unit_price: number; cigar: { name: string; size: string | null }; }[];
}

export default function Fulfillment() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { logAudit } = useFinanceAudit();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('picklist');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Packing dialog
  const [packingOrder, setPackingOrder] = useState<FulfillmentOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchOrders(); }, [currentStore]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, order_number, fulfillment_status, fulfillment_type, payment_type, channel, sla_deadline, items_count, total, created_at, store_id, customers(name), items:order_items(id, quantity, unit_price, cigar:cigars(name, size))')
      .in('fulfillment_status', ['new', 'unfulfilled', 'accepted', 'picking', 'packed', 'ready'])
      .eq('is_voided', false)
      .order('sla_deadline', { ascending: true, nullsFirst: false });

    if (currentStore) query = query.eq('store_id', currentStore.id);

    const { data } = await query;
    setOrders((data as unknown as FulfillmentOrder[]) || []);
    setLoading(false);
  };

  const picklistOrders = orders.filter(o => ['new', 'unfulfilled', 'accepted', 'picking'].includes(o.fulfillment_status));
  const packingOrders = orders.filter(o => o.fulfillment_status === 'picking');
  const dispatchOrders = orders.filter(o => ['packed', 'ready'].includes(o.fulfillment_status));

  const filtered = (tab: string) => {
    const list = tab === 'picklist' ? picklistOrders : tab === 'packing' ? packingOrders : dispatchOrders;
    if (!search) return list;
    return list.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customers?.name?.toLowerCase().includes(search.toLowerCase()));
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedOrders(next);
  };

  const selectAll = (list: FulfillmentOrder[]) => {
    setSelectedOrders(new Set(list.map(o => o.id)));
  };

  // Batch accept
  const batchAccept = async () => {
    if (selectedOrders.size === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders')
        .update({ fulfillment_status: 'accepted', accepted_at: new Date().toISOString() })
        .in('id', Array.from(selectedOrders));
      if (error) throw error;
      toast.success(`${selectedOrders.size} orders accepted`);
      setSelectedOrders(new Set());
      fetchOrders();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  // Batch move to picking
  const batchPick = async () => {
    if (selectedOrders.size === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders')
        .update({ fulfillment_status: 'picking' })
        .in('id', Array.from(selectedOrders));
      if (error) throw error;
      toast.success(`${selectedOrders.size} orders moved to picking`);
      setSelectedOrders(new Set());
      fetchOrders();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  // Open packing checklist
  const openPackingChecklist = (order: FulfillmentOrder) => {
    setPackingOrder(order);
    setCheckedItems(new Set());
  };

  // Confirm packed
  const confirmPacked = async () => {
    if (!packingOrder) return;
    const allItems = packingOrder.items || [];
    if (checkedItems.size < allItems.length) {
      toast.error('Please verify all items before packing');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders')
        .update({ fulfillment_status: 'packed', packed_at: new Date().toISOString() })
        .eq('id', packingOrder.id);
      if (error) throw error;
      await logAudit({ entityType: 'order', entityId: packingOrder.id, actionType: 'fulfillment_packed', storeId: packingOrder.store_id, afterData: { fulfillment_status: 'packed' } });
      toast.success('Order packed successfully');
      setPackingOrder(null);
      fetchOrders();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  // Mark dispatch ready
  const markReady = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ fulfillment_status: 'ready' }).eq('id', orderId);
    if (error) { toast.error('Failed'); return; }
    toast.success('Marked ready for dispatch');
    fetchOrders();
  };

  const OrderRow = ({ order, showSelect }: { order: FulfillmentOrder; showSelect?: boolean }) => {
    const sla = getSlaStatus(order.sla_deadline);
    const ffCfg = FULFILLMENT_CONFIG[order.fulfillment_status] || FULFILLMENT_CONFIG.new;
    const chCfg = CHANNEL_CONFIG[(order.channel || 'in_store') as SalesChannel] || CHANNEL_CONFIG.in_store;

    return (
      <tr className="table-row-hover border-t border-border">
        {showSelect && (
          <td className="p-3">
            <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded border-border" />
          </td>
        )}
        <td className="p-3">
          <span className={cn('text-xs font-medium flex items-center gap-1', sla.color)}>
            {sla.urgent && <AlertTriangle className="w-3 h-3" />}
            {sla.label}
          </span>
        </td>
        <td className="p-3">
          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', chCfg.color)}>{chCfg.label}</span>
        </td>
        <td className="p-3">
          <div>
            <span className="font-medium text-sm">{order.order_number}</span>
            <p className="text-xs text-muted-foreground">{order.customers?.name || 'Walk-in'}</p>
          </div>
        </td>
        <td className="p-3 text-center text-sm">{order.items_count || order.items?.length || '-'}</td>
        <td className="p-3">
          <Badge variant={order.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[10px]">
            {order.payment_type === 'cod' ? 'COD' : 'Prepaid'}
          </Badge>
        </td>
        <td className="p-3">
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', ffCfg.color)}>{ffCfg.label}</span>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1">
            {order.fulfillment_status === 'picking' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPackingChecklist(order)}>
                <Package className="w-3 h-3 mr-1" /> Pack
              </Button>
            )}
            {order.fulfillment_status === 'packed' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markReady(order.id)}>
                <Truck className="w-3 h-3 mr-1" /> Ready
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/orders/${order.id}`)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display">Fulfillment</h1>
            <p className="text-muted-foreground text-sm mt-1">Pick, pack, and dispatch orders by SLA urgency</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48 h-9 text-sm" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
              <div><p className="text-2xl font-bold">{picklistOrders.length}</p><p className="text-xs text-muted-foreground">To Pick</p></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="w-5 h-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{packingOrders.length}</p><p className="text-xs text-muted-foreground">To Pack</p></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Truck className="w-5 h-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{dispatchOrders.length}</p><p className="text-xs text-muted-foreground">To Dispatch</p></div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="picklist">Picklist ({picklistOrders.length})</TabsTrigger>
            <TabsTrigger value="packing">Packing ({packingOrders.length})</TabsTrigger>
            <TabsTrigger value="dispatch">Dispatch ({dispatchOrders.length})</TabsTrigger>
          </TabsList>

          {['picklist', 'packing', 'dispatch'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {/* Batch actions */}
              {tab === 'picklist' && selectedOrders.size > 0 && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{selectedOrders.size} selected</span>
                  <Button size="sm" onClick={batchAccept} disabled={submitting}>Accept Selected</Button>
                  <Button size="sm" variant="outline" onClick={batchPick} disabled={submitting}>Move to Picking</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedOrders(new Set())}>Clear</Button>
                </div>
              )}

              <div className="glass-card overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : filtered(tab).length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold">All caught up!</h3>
                    <p className="text-sm text-muted-foreground mt-1">No orders in this stage</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr>
                          {tab === 'picklist' && (
                            <th className="p-3 w-10">
                              <input type="checkbox" onChange={() => { if (selectedOrders.size === filtered(tab).length) setSelectedOrders(new Set()); else selectAll(filtered(tab)); }} checked={selectedOrders.size === filtered(tab).length && filtered(tab).length > 0} className="rounded border-border" />
                            </th>
                          )}
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">SLA</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Channel</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Order</th>
                          <th className="text-center p-3 text-xs font-medium text-muted-foreground">Items</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Payment</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="p-3 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered(tab).map(order => (
                          <OrderRow key={order.id} order={order} showSelect={tab === 'picklist'} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Packing Checklist Dialog */}
        <Dialog open={!!packingOrder} onOpenChange={() => setPackingOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Pack Order {packingOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Verify each item before marking as packed:</p>
              {(packingOrder?.items || []).map(item => (
                <label key={item.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  checkedItems.has(item.id) ? 'border-primary bg-primary/5' : 'border-border'
                )}>
                  <input type="checkbox" checked={checkedItems.has(item.id)}
                    onChange={() => { const next = new Set(checkedItems); next.has(item.id) ? next.delete(item.id) : next.add(item.id); setCheckedItems(next); }}
                    className="rounded border-border" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.cigar.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cigar.size && `Size: ${item.cigar.size} • `}
                      Qty: {item.quantity}
                    </p>
                  </div>
                  {checkedItems.has(item.id) && <Check className="w-4 h-4 text-primary" />}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPackingOrder(null)}>Cancel</Button>
              <Button onClick={confirmPacked} disabled={submitting || checkedItems.size < (packingOrder?.items?.length || 0)}>
                {submitting ? 'Packing...' : `Confirm Packed (${checkedItems.size}/${packingOrder?.items?.length || 0})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
