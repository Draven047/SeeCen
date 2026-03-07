import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
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
import { ArrowLeft, Lock, FileText, Ban, CreditCard, Download, AlertTriangle, CheckCircle, Truck, Package, RotateCcw, Check, Circle, X } from 'lucide-react';
import { DispatchDrawer } from '@/components/shipping/DispatchDrawer';
import { FULFILLMENT_CONFIG, TIMELINE_STEPS, EDGE_STATES, CHANNEL_CONFIG, getSlaStatus, type SalesChannel } from '@/lib/channelConnectors';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { INDIAN_STATES, calculateTax } from '@/lib/indianStates';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';
import { generateTaxInvoice, type LegacyInvoiceData, type InvoiceStore } from '@/lib/invoiceGenerator';

interface OrderDetail {
  id: string;
  order_number: string;
  invoice_number: string | null;
  invoice_date: string | null;
  status: string;
  channel: string;
  fulfillment_status: string;
  fulfillment_type: string;
  payment_type: string;
  sla_deadline: string | null;
  items_count: number;
  external_channel_order_number: string | null;
  is_finalized: boolean;
  is_voided: boolean;
  void_reason: string | null;
  voided_at: string | null;
  subtotal: number;
  tax: number;
  total: number;
  cgst_rate: number; sgst_rate: number; igst_rate: number; cess_rate: number;
  cgst_amount: number; sgst_amount: number; igst_amount: number; cess_amount: number;
  place_of_supply_state: string | null;
  place_of_supply_code: string | null;
  notes: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  fume_points_earned: number;
  fume_points_redeemed: number;
  created_at: string;
  accepted_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  declined_reason: string | null;
  cancelled_reason: string | null;
  store_id: string | null;
  customer_id: string | null;
  customer?: { name: string; phone: string | null; address: string | null; fume_points_balance: number } | null;
  store?: { name: string } | null;
  items?: { id: string; quantity: number; unit_price: number; total_price: number; cigar: { name: string } }[];
}

interface CreditNote {
  id: string; credit_note_number: string; credit_type: string; amount: number; total_amount: number; reason: string; created_at: string;
}

interface StoreTaxSettings {
  state_code: string; state_name: string; default_cgst_rate: number; default_sgst_rate: number; default_igst_rate: number; default_cess_rate: number; cess_enabled: boolean;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { logAudit } = useFinanceAudit();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDispatchDrawer, setShowDispatchDrawer] = useState(false);

  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [creditNoteForm, setCreditNoteForm] = useState({ type: 'full' as 'full' | 'partial', amount: 0, reason: '', deductPoints: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (id) fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data: orderData, error } = await supabase
      .from('orders')
      .select(`*, customer:customers(name, phone, address, fume_points_balance), store:stores(name), items:order_items(id, quantity, unit_price, total_price, cigar:cigars(name))`)
      .eq('id', id)
      .single();

    if (error || !orderData) { toast.error('Order not found'); navigate('/orders'); return; }
    setOrder(orderData as unknown as OrderDetail);

    const { data: cnData } = await supabase.from('credit_notes').select('*').eq('original_order_id', id).order('created_at', { ascending: false });
    setCreditNotes(cnData || []);

    if (orderData.store_id) {
      const { data: taxData } = await supabase.from('store_tax_settings').select('*').eq('store_id', orderData.store_id).maybeSingle();
      if (taxData) { setStoreTaxSettings(taxData); setPlaceOfSupply(taxData.state_code); }
    }
    setLoading(false);
  };

  // Fulfillment status transition
  const transitionFulfillment = async (newStatus: string, extraFields?: Record<string, any>) => {
    if (!order) return;
    setSubmitting(true);
    try {
      const updates: Record<string, any> = { fulfillment_status: newStatus, ...extraFields };
      if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString();
      if (newStatus === 'packed') updates.packed_at = new Date().toISOString();
      if (newStatus === 'in_transit') updates.shipped_at = new Date().toISOString();
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
      if (error) throw error;

      await logAudit({ entityType: 'order', entityId: order.id, actionType: `fulfillment_${newStatus}`, storeId: order.store_id, beforeData: { fulfillment_status: order.fulfillment_status }, afterData: { fulfillment_status: newStatus } });
      toast.success(`Status updated to ${FULFILLMENT_CONFIG[newStatus]?.label || newStatus}`);
      fetchOrder();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) { toast.error('Reason required'); return; }
    await transitionFulfillment('declined', { declined_reason: declineReason });
    setShowDeclineDialog(false); setDeclineReason('');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Reason required'); return; }
    await transitionFulfillment('cancelled', { cancelled_reason: cancelReason });
    setShowCancelDialog(false); setCancelReason('');
  };

  // Finance actions (finalize, void, credit note) - kept from original
  const handleFinalize = async () => {
    if (!order || !order.store_id || !placeOfSupply) { toast.error('Select place of supply'); return; }
    if (!storeTaxSettings) { toast.error('Store tax settings not configured'); return; }
    setSubmitting(true);
    try {
      const taxCalc = calculateTax(order.subtotal, storeTaxSettings.state_code, placeOfSupply, storeTaxSettings.default_cgst_rate, storeTaxSettings.default_sgst_rate, storeTaxSettings.default_igst_rate, storeTaxSettings.default_cess_rate, storeTaxSettings.cess_enabled);
      const { data: invoiceNumber, error: invError } = await supabase.rpc('generate_invoice_number', { p_store_id: order.store_id });
      if (invError) throw invError;
      const supplyState = INDIAN_STATES.find(s => s.code === placeOfSupply);
      const snapshotData = JSON.stringify({ items: order.items, customer: order.customer, store: order.store, subtotal: order.subtotal, taxCalc, total: order.subtotal + taxCalc.totalTax });
      const { error } = await supabase.from('orders').update({
        invoice_number: invoiceNumber, invoice_date: new Date().toISOString(), is_finalized: true,
        finalized_at: new Date().toISOString(), finalized_by: user?.id,
        place_of_supply_state: supplyState?.name || null, place_of_supply_code: placeOfSupply,
        cgst_rate: taxCalc.cgstRate, sgst_rate: taxCalc.sgstRate, igst_rate: taxCalc.igstRate, cess_rate: taxCalc.cessRate,
        cgst_amount: taxCalc.cgstAmount, sgst_amount: taxCalc.sgstAmount, igst_amount: taxCalc.igstAmount, cess_amount: taxCalc.cessAmount,
        tax: taxCalc.totalTax, total: order.subtotal + taxCalc.totalTax, invoice_snapshot: JSON.parse(snapshotData)
      }).eq('id', order.id);
      if (error) throw error;
      await logAudit({ entityType: 'order', entityId: order.id, actionType: 'finalize_invoice', storeId: order.store_id, beforeData: { is_finalized: false }, afterData: { is_finalized: true, invoice_number: invoiceNumber } });
      toast.success(`Invoice ${invoiceNumber} finalized`);
      setShowFinalizeDialog(false); fetchOrder();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleVoid = async () => {
    if (!order || !voidReason.trim()) { toast.error('Reason required'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders').update({ is_voided: true, voided_at: new Date().toISOString(), voided_by: user?.id, void_reason: voidReason }).eq('id', order.id);
      if (error) throw error;
      await logAudit({ entityType: 'order', entityId: order.id, actionType: 'void_invoice', storeId: order.store_id, beforeData: { is_voided: false }, afterData: { is_voided: true, void_reason: voidReason }, reason: voidReason });
      toast.success('Invoice voided'); setShowVoidDialog(false); fetchOrder();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateCreditNote = async () => {
    if (!order || !creditNoteForm.reason.trim()) { toast.error('Reason required'); return; }
    const amount = creditNoteForm.type === 'full' ? order.total : creditNoteForm.amount;
    if (amount <= 0 || amount > order.total) { toast.error('Invalid amount'); return; }
    setSubmitting(true);
    try {
      const { data: cnNumber, error: cnError } = await supabase.rpc('generate_credit_note_number', { p_store_id: order.store_id });
      if (cnError) throw cnError;
      const ratio = amount / order.total;
      const cgstAmount = order.cgst_amount * ratio, sgstAmount = order.sgst_amount * ratio, igstAmount = order.igst_amount * ratio, cessAmount = order.cess_amount * ratio;
      const baseAmount = amount - cgstAmount - sgstAmount - igstAmount - cessAmount;
      let pointsDeducted = 0;
      if (creditNoteForm.deductPoints && order.fume_points_earned > 0) pointsDeducted = Math.round(order.fume_points_earned * ratio);
      const { data: newCn, error } = await supabase.from('credit_notes').insert({
        credit_note_number: cnNumber, original_order_id: order.id, store_id: order.store_id,
        credit_type: creditNoteForm.type, amount: baseAmount,
        cgst_amount: cgstAmount, sgst_amount: sgstAmount, igst_amount: igstAmount, cess_amount: cessAmount,
        total_amount: amount, reason: creditNoteForm.reason, deduct_fume_points: creditNoteForm.deductPoints,
        points_deducted: pointsDeducted, created_by: user?.id
      }).select().single();
      if (error) throw error;
      if (pointsDeducted > 0 && order.customer_id) {
        await supabase.from('customers').update({ fume_points_balance: (order.customer?.fume_points_balance || 0) - pointsDeducted }).eq('id', order.customer_id);
        await supabase.from('fume_points_ledger').insert({ customer_id: order.customer_id, points: -pointsDeducted, type: 'deduction', reason: `Credit note ${cnNumber}`, order_id: order.id, created_by: user?.id });
      }
      toast.success(`Credit Note ${cnNumber} created`);
      setShowCreditNoteDialog(false); setCreditNoteForm({ type: 'full', amount: 0, reason: '', deductPoints: false }); fetchOrder();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const downloadInvoice = async () => {
    if (!order || !order.is_finalized) return;

    // Fetch store finance settings for dynamic branding
    let storeInfo: InvoiceStore = { name: order.store?.name || 'Store' };
    if (order.store_id) {
      const [storeRes, financeRes] = await Promise.all([
        supabase.from('stores').select('name, address, phone').eq('id', order.store_id).single(),
        supabase.from('store_finance_settings').select('*').eq('store_id', order.store_id).maybeSingle(),
      ]);
      if (storeRes.data) {
        storeInfo.name = storeRes.data.name;
        storeInfo.address = storeRes.data.address;
        storeInfo.phone = storeRes.data.phone;
      }
      if (financeRes.data) {
        storeInfo.gstin = financeRes.data.gstin;
        storeInfo.bankName = financeRes.data.bank_name;
        storeInfo.accountNumber = financeRes.data.account_number;
        storeInfo.accountHolder = financeRes.data.account_holder;
        storeInfo.ifscCode = financeRes.data.ifsc_code;
        storeInfo.upiId = financeRes.data.upi_id;
        storeInfo.invoiceFooter = financeRes.data.invoice_footer;
        storeInfo.termsAndConditions = financeRes.data.terms_and_conditions;
        storeInfo.returnPolicy = (financeRes.data as any).return_policy;
        storeInfo.footerNotes = (financeRes.data as any).footer_notes;
        storeInfo.invoiceType = (financeRes.data as any).invoice_type;
        storeInfo.stateName = storeTaxSettings?.state_name;
        storeInfo.stateCode = storeTaxSettings?.state_code;
      }
    }

    const invoiceData: LegacyInvoiceData = {
      orderNumber: order.invoice_number || order.order_number,
      invoiceDate: order.invoice_date ? new Date(order.invoice_date) : new Date(),
      customer: { name: order.customer?.name || 'Walk-in Customer', phone: order.customer?.phone, address: order.customer?.address, gstin: null, state: order.place_of_supply_state || undefined, stateCode: order.place_of_supply_code || undefined },
      shippingAddress: order.shipping_address,
      items: (order.items || []).map(item => ({ name: item.cigar.name, quantity: item.quantity, rate: item.unit_price, discount: 0 })),
      subtotal: order.subtotal, cgst: order.cgst_amount, sgst: order.sgst_amount, igst: order.igst_amount, cess: order.cess_amount, packingCharges: 0, total: order.total,
      channel: order.channel,
      paymentMode: order.payment_type === 'cod' ? 'COD' : 'Prepaid',
      paymentStatus: 'Confirmed',
      store: storeInfo,
    };
    generateTaxInvoice(invoiceData).save(`Invoice-${order.invoice_number}.pdf`);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  if (!order) return null;

  const isLocked = order.is_finalized;
  const isVoided = order.is_voided;
  const canFinalize = !isLocked && !isVoided && storeTaxSettings;
  const canVoid = isLocked && !isVoided && (role === 'admin' || role === 'operations');
  const canCreateCreditNote = isLocked && !isVoided;
  const canAct = !isVoided && (role === 'admin' || role === 'manager' || role === 'operations' || role === 'sales');
  const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + cn.total_amount, 0);
  const netAmount = order.total - totalCreditNotes;
  const currentStep = FULFILLMENT_CONFIG[order.fulfillment_status]?.step ?? 0;
  const isEdgeState = EDGE_STATES.includes(order.fulfillment_status);
  const chCfg = CHANNEL_CONFIG[(order.channel || 'in_store') as SalesChannel] || CHANNEL_CONFIG.in_store;
  const sla = getSlaStatus(order.sla_deadline);
  const isMarketplace = order.fulfillment_type === 'marketplace_logistics';

  // Next action buttons based on current status + fulfillment type
  const getNextActions = () => {
    if (isEdgeState || isVoided) return [];
    const fs = order.fulfillment_status;
    const actions: { label: string; status: string; variant?: 'default' | 'destructive' | 'outline' }[] = [];

    if (fs === 'new' || fs === 'unfulfilled') {
      actions.push({ label: 'Accept Order', status: 'accepted' });
      actions.push({ label: 'Decline', status: '_decline', variant: 'destructive' });
    }
    if (fs === 'accepted') actions.push({ label: 'Start Picking', status: 'picking' });
    if (fs === 'picking') actions.push({ label: 'Mark Packed', status: 'packed' });
    if (fs === 'packed') {
      if (isMarketplace) {
        actions.push({ label: 'Mark Ready for Pickup', status: 'ready' });
      } else {
        actions.push({ label: 'Book Pickup', status: '_dispatch' });
      }
    }
    if (fs === 'ready') {
      if (isMarketplace) {
        actions.push({ label: 'Confirm Handover', status: 'handover' });
      } else {
        actions.push({ label: 'Mark Shipped', status: 'in_transit' });
      }
    }
    if (fs === 'handover') actions.push({ label: 'In Transit', status: 'in_transit' });
    if (fs === 'in_transit') {
      actions.push({ label: 'Mark Delivered', status: 'delivered' });
      actions.push({ label: 'Failed Delivery', status: 'failed_delivery', variant: 'destructive' });
      actions.push({ label: 'RTO', status: 'rto', variant: 'destructive' });
    }

    // Cancel always available until delivered
    if (!['delivered', 'cancelled', 'declined', 'rto'].includes(fs)) {
      actions.push({ label: 'Cancel', status: '_cancel', variant: 'outline' });
    }

    return actions;
  };

  const handleAction = (status: string) => {
    if (status === '_decline') { setShowDeclineDialog(true); return; }
    if (status === '_cancel') { setShowCancelDialog(true); return; }
    if (status === '_dispatch') { setShowDispatchDrawer(true); return; }
    transitionFulfillment(status);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{order.invoice_number || order.order_number}</h1>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', chCfg.color)}>{chCfg.label}</span>
                {isLocked && <Badge variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-0.5" /> Finalized</Badge>}
                {isVoided && <Badge variant="destructive" className="text-[10px]"><Ban className="w-3 h-3 mr-0.5" /> Voided</Badge>}
                <Badge variant={order.payment_type === 'cod' ? 'outline' : 'secondary'} className="text-[10px]">
                  {order.payment_type === 'cod' ? 'COD' : 'Prepaid'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {isMarketplace ? 'Marketplace Logistics' : 'Self Ship'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {order.store?.name} • {new Date(order.created_at).toLocaleDateString()}
                {order.sla_deadline && <span className={cn('ml-2', sla.color)}>SLA: {sla.label}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isLocked && !isVoided && <Button variant="outline" size="sm" onClick={downloadInvoice}><Download className="w-4 h-4 mr-1" /> Invoice</Button>}
            {canFinalize && <Button size="sm" onClick={() => setShowFinalizeDialog(true)}><CheckCircle className="w-4 h-4 mr-1" /> Finalize</Button>}
            {canCreateCreditNote && <Button variant="outline" size="sm" onClick={() => setShowCreditNoteDialog(true)}><CreditCard className="w-4 h-4 mr-1" /> Credit Note</Button>}
            {canVoid && <Button variant="destructive" size="sm" onClick={() => setShowVoidDialog(true)}><Ban className="w-4 h-4 mr-1" /> Void</Button>}
          </div>
        </div>

        {/* Void Warning */}
        {isVoided && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Invoice voided</p>
              <p className="text-sm text-muted-foreground mt-1">Reason: {order.void_reason} • {new Date(order.voided_at!).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Edge State Warning */}
        {isEdgeState && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <X className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">{FULFILLMENT_CONFIG[order.fulfillment_status]?.label}</p>
              {order.declined_reason && <p className="text-sm text-muted-foreground">Reason: {order.declined_reason}</p>}
              {order.cancelled_reason && <p className="text-sm text-muted-foreground">Reason: {order.cancelled_reason}</p>}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {!isEdgeState && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-sm mb-4">Order Timeline</h3>
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const stepNum = FULFILLMENT_CONFIG[step.key]?.step ?? i;
                const done = currentStep > stepNum;
                const active = currentStep === stepNum;

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all',
                        done ? 'bg-primary border-primary text-primary-foreground' :
                        active ? 'border-primary text-primary bg-primary/10' :
                        'border-border text-muted-foreground'
                      )}>
                        {done ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={cn('text-[10px] mt-1 text-center', active ? 'text-primary font-medium' : 'text-muted-foreground')}>{step.label}</span>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={cn('flex-1 h-0.5 mx-1', done ? 'bg-primary' : 'bg-border')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fulfillment Actions */}
        {canAct && getNextActions().length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground mr-2">Actions:</span>
              {getNextActions().map(action => (
                <Button key={action.status} size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : action.variant === 'outline' ? 'outline' : 'default'}
                  onClick={() => handleAction(action.status)} disabled={submitting}>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Shipping */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 text-sm">Customer & Shipping</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-medium text-sm">{order.customer?.name || 'Walk-in Customer'}</p>
                  {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Shipping Address</Label>
                  <p className="text-xs">{order.shipping_address || order.customer?.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 text-sm">Items ({order.items_count || order.items?.length || 0})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items || []).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.cigar.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{item.total_price.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Credit Notes */}
            {creditNotes.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4 text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Credit Notes</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>CN #</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {creditNotes.map(cn => (
                      <TableRow key={cn.id}>
                        <TableCell className="font-mono text-xs">{cn.credit_note_number}</TableCell>
                        <TableCell className="capitalize text-xs">{cn.credit_type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cn.reason}</TableCell>
                        <TableCell className="text-right text-destructive text-xs">-₹{cn.total_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 text-sm">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal.toLocaleString()}</span></div>
                {order.cgst_amount > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">CGST ({order.cgst_rate}%)</span><span>₹{order.cgst_amount.toLocaleString()}</span></div>}
                {order.sgst_amount > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">SGST ({order.sgst_rate}%)</span><span>₹{order.sgst_amount.toLocaleString()}</span></div>}
                {order.igst_amount > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">IGST ({order.igst_rate}%)</span><span>₹{order.igst_amount.toLocaleString()}</span></div>}
                <div className="border-t pt-2 flex justify-between font-semibold"><span>Total</span><span className={cn(isVoided && "line-through text-muted-foreground")}>₹{order.total.toLocaleString()}</span></div>
                {totalCreditNotes > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-destructive"><span>Credit Notes</span><span>-₹{totalCreditNotes.toLocaleString()}</span></div>
                    <div className="border-t pt-2 flex justify-between font-bold"><span>Net</span><span className="text-primary">₹{netAmount.toLocaleString()}</span></div>
                  </>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-2 text-sm">Notes</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalize Invoice</DialogTitle><DialogDescription>Once finalized, the invoice is locked.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={submitting || !placeOfSupply}>{submitting ? 'Processing...' : 'Finalize'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Void Invoice</DialogTitle></DialogHeader>
          <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={submitting || !voidReason.trim()}>{submitting ? 'Processing...' : 'Void'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditNoteDialog} onOpenChange={setShowCreditNoteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Credit Note</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={creditNoteForm.type} onValueChange={(v: 'full' | 'partial') => setCreditNoteForm(f => ({ ...f, type: v, amount: v === 'full' ? order.total : 0 }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full (₹{order.total.toLocaleString()})</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            {creditNoteForm.type === 'partial' && <Input type="number" value={creditNoteForm.amount} onChange={(e) => setCreditNoteForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} max={order.total} />}
            <Textarea value={creditNoteForm.reason} onChange={(e) => setCreditNoteForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason..." rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCreditNote} disabled={submitting || !creditNoteForm.reason.trim()}>{submitting ? 'Processing...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Decline Order</DialogTitle></DialogHeader>
          <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for declining..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDecline} disabled={submitting || !declineReason.trim()}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Cancel Order</DialogTitle></DialogHeader>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={submitting || !cancelReason.trim()}>Confirm Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Drawer */}
      <DispatchDrawer
        open={showDispatchDrawer}
        onOpenChange={setShowDispatchDrawer}
        orderId={order.id}
        storeId={order.store_id}
        storeAddress={order.store?.name}
        onSuccess={fetchOrder}
      />
    </DashboardLayout>
  );
}
