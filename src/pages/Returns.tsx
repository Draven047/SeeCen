import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Plus, CheckCircle, XCircle, Clock, Package, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';

interface ReturnRequest {
  id: string;
  order_id: string;
  status: string;
  return_type: string;
  reason: string;
  notes: string | null;
  refund_amount: number;
  restock_items: boolean;
  created_at: string;
  processed_at: string | null;
  order?: { order_number: string; invoice_number: string | null; total: number; store_id: string | null };
  customer?: { name: string } | null;
  items?: ReturnItem[];
}

interface ReturnItem {
  id: string;
  quantity: number;
  unit_price: number;
  cigar_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  order_item_id: string;
}

interface OrderForReturn {
  id: string;
  order_number: string;
  invoice_number: string | null;
  total: number;
  store_id: string | null;
  customer_id: string | null;
  customer?: { name: string } | null;
  items: { id: string; quantity: number; unit_price: number; total_price: number; cigar_id: string; product_id: string | null; variant_id: string | null; cigar: { name: string } }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/10 text-blue-600', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600', icon: Package },
};

export default function Returns() {
  const { user, role } = useAuth();
  const { logAudit } = useFinanceAudit();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create return dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [foundOrders, setFoundOrders] = useState<OrderForReturn[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderForReturn | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Process dialog
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processingReturn, setProcessingReturn] = useState<ReturnRequest | null>(null);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected'>('approved');
  const [processNotes, setProcessNotes] = useState('');

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('return_requests')
      .select('*, order:orders(order_number, invoice_number, total, store_id), customer:customers(name)')
      .order('created_at', { ascending: false });
    setReturns((data as unknown as ReturnRequest[]) || []);
    setLoading(false);
  };

  const searchOrders = async () => {
    if (!orderSearch.trim()) return;
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, invoice_number, total, store_id, customer_id, customer:customers(name), items:order_items(id, quantity, unit_price, total_price, cigar_id, product_id, variant_id, cigar:cigars(name))')
      .or(`order_number.ilike.%${orderSearch}%,invoice_number.ilike.%${orderSearch}%`)
      .eq('is_voided', false)
      .limit(10);
    setFoundOrders((data as unknown as OrderForReturn[]) || []);
  };

  const handleSelectOrder = (order: OrderForReturn) => {
    setSelectedOrder(order);
    setFoundOrders([]);
    setSelectedItems({});
  };

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder || !reason.trim() || Object.keys(selectedItems).length === 0) {
      toast.error('Please select items and provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      const items = selectedOrder.items.filter(i => selectedItems[i.id]);
      const refundAmount = items.reduce((s, i) => s + (i.unit_price * (selectedItems[i.id] || 0)), 0);

      const { data: rr, error } = await supabase.from('return_requests').insert({
        order_id: selectedOrder.id,
        store_id: selectedOrder.store_id,
        customer_id: selectedOrder.customer_id,
        return_type: returnType,
        reason,
        refund_amount: refundAmount,
        restock_items: restockItems,
        created_by: user!.id,
      }).select().single();

      if (error) throw error;

      const itemInserts = items.map(i => ({
        return_request_id: rr.id,
        order_item_id: i.id,
        cigar_id: i.cigar_id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: selectedItems[i.id],
        unit_price: i.unit_price,
      }));

      await supabase.from('return_request_items').insert(itemInserts);

      await logAudit({
        entityType: 'order',
        entityId: selectedOrder.id,
        actionType: 'create_return_request',
        storeId: selectedOrder.store_id,
        afterData: { return_request_id: rr.id, return_type: returnType, refund_amount: refundAmount },
        reason,
      });

      toast.success('Return request created');
      resetCreateForm();
      fetchReturns();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create return request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcess = async () => {
    if (!processingReturn) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('return_requests').update({
        status: processAction === 'approved' ? (processingReturn.restock_items ? 'completed' : 'approved') : 'rejected',
        processed_by: user!.id,
        processed_at: new Date().toISOString(),
        notes: processNotes || null,
      }).eq('id', processingReturn.id);

      if (error) throw error;

      // If approved and restock, update inventory
      if (processAction === 'approved' && processingReturn.restock_items) {
        const { data: items } = await supabase
          .from('return_request_items')
          .select('*')
          .eq('return_request_id', processingReturn.id);

        if (items) {
          for (const item of items) {
            const cigarId = item.cigar_id;
            const storeId = processingReturn.order?.store_id;
            if (cigarId && storeId) {
              // Update store inventory
              const { data: inv } = await supabase
                .from('store_inventory')
                .select('id, quantity')
                .eq('store_id', storeId)
                .eq('cigar_id', cigarId)
                .maybeSingle();

              if (inv) {
                await supabase.from('store_inventory').update({ quantity: inv.quantity + item.quantity }).eq('id', inv.id);
              }
            }
          }
        }

        // Update order fulfillment status to 'returned'
        await supabase.from('orders').update({ fulfillment_status: 'returned' }).eq('id', processingReturn.order_id);
      }

      await logAudit({
        entityType: 'order',
        entityId: processingReturn.order_id,
        actionType: processAction === 'approved' ? 'approve_return' : 'reject_return',
        storeId: processingReturn.order?.store_id,
        afterData: { status: processAction, notes: processNotes },
      });

      toast.success(`Return request ${processAction}`);
      setShowProcessDialog(false);
      setProcessingReturn(null);
      setProcessNotes('');
      fetchReturns();
    } catch (e: any) {
      toast.error(e.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateDialog(false);
    setSelectedOrder(null);
    setSelectedItems({});
    setOrderSearch('');
    setFoundOrders([]);
    setReason('');
    setReturnType('return');
    setRestockItems(true);
  };

  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  const canProcess = role === 'admin' || role === 'operations' || role === 'manager';

  const filtered = returns.filter(r =>
    !search || r.order?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Returns & Exchanges</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage return requests, process refunds, and restock inventory</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Return
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by order, customer, reason…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Returns Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No return requests found</TableCell></TableRow>
              ) : filtered.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.order?.invoice_number || r.order?.order_number}</TableCell>
                    <TableCell>{r.customer?.name || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{r.return_type}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell className="font-semibold">{fmt(r.refund_amount)}</TableCell>
                    <TableCell><Badge className={cn('text-xs', cfg.color)}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      {canProcess && r.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => { setProcessingReturn(r); setShowProcessDialog(true); }}>
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Create Return Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={v => { if (!v) resetCreateForm(); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Return Request</DialogTitle>
              <DialogDescription>Search for an order and select items to return</DialogDescription>
            </DialogHeader>

            {!selectedOrder ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Search by order number…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchOrders()} />
                  <Button onClick={searchOrders} variant="outline">Search</Button>
                </div>
                {foundOrders.map(o => (
                  <button key={o.id} onClick={() => handleSelectOrder(o)} className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between">
                      <span className="font-medium">{o.invoice_number || o.order_number}</span>
                      <span className="text-sm font-semibold">{fmt(o.total)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.customer?.name || 'Walk-in'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedOrder.invoice_number || selectedOrder.order_number}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer?.name || 'Walk-in'} · {fmt(selectedOrder.total)}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Select Items to Return</Label>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className={cn("flex items-center gap-3 p-2 rounded-lg border transition-colors", selectedItems[item.id] ? 'bg-primary/5 border-primary/30' : '')}>
                        <input type="checkbox" checked={!!selectedItems[item.id]} onChange={() => toggleItem(item.id, item.quantity)} className="rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.cigar.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} × {item.quantity}</p>
                        </div>
                        {selectedItems[item.id] && (
                          <Input type="number" min={1} max={item.quantity} value={selectedItems[item.id]} onChange={e => updateItemQty(item.id, Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))} className="w-16 h-8 text-center" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={returnType} onValueChange={(v: any) => setReturnType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={restockItems} onCheckedChange={setRestockItems} />
                    <Label className="text-sm">Restock items</Label>
                  </div>
                </div>

                <div>
                  <Label>Reason</Label>
                  <Textarea placeholder="Reason for return…" value={reason} onChange={e => setReason(e.target.value)} />
                </div>

                {Object.keys(selectedItems).length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">Estimated Refund: </span>
                    <span className="font-bold">{fmt(selectedOrder.items.filter(i => selectedItems[i.id]).reduce((s, i) => s + (i.unit_price * (selectedItems[i.id] || 0)), 0))}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={resetCreateForm}>Cancel</Button>
              {selectedOrder && (
                <Button onClick={handleCreateReturn} disabled={submitting || Object.keys(selectedItems).length === 0 || !reason.trim()}>
                  {submitting ? 'Creating…' : 'Create Return'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Dialog */}
        <Dialog open={showProcessDialog} onOpenChange={v => { if (!v) { setShowProcessDialog(false); setProcessingReturn(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Return Request</DialogTitle>
              <DialogDescription>Approve or reject this return for {processingReturn?.order?.order_number}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Type:</strong> {processingReturn?.return_type}</p>
                <p><strong>Reason:</strong> {processingReturn?.reason}</p>
                <p><strong>Refund:</strong> {fmt(processingReturn?.refund_amount || 0)}</p>
                <p><strong>Restock:</strong> {processingReturn?.restock_items ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={processAction} onValueChange={(v: any) => setProcessAction(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve & Process</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={processNotes} onChange={e => setProcessNotes(e.target.value)} placeholder="Processing notes…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessDialog(false)}>Cancel</Button>
              <Button onClick={handleProcess} disabled={submitting} variant={processAction === 'rejected' ? 'destructive' : 'default'}>
                {submitting ? 'Processing…' : processAction === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
