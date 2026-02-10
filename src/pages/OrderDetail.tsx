import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Lock, FileText, Ban, CreditCard, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/indianStates';
import { calculateTax } from '@/lib/indianStates';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';
import { generateTaxInvoice, type InvoiceData } from '@/lib/invoiceGenerator';

interface OrderDetail {
  id: string;
  order_number: string;
  invoice_number: string | null;
  invoice_date: string | null;
  status: string;
  is_finalized: boolean;
  is_voided: boolean;
  void_reason: string | null;
  voided_at: string | null;
  subtotal: number;
  tax: number;
  total: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  place_of_supply_state: string | null;
  place_of_supply_code: string | null;
  notes: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  fume_points_earned: number;
  fume_points_redeemed: number;
  created_at: string;
  store_id: string | null;
  customer_id: string | null;
  customer?: { name: string; phone: string | null; address: string | null; fume_points_balance: number } | null;
  store?: { name: string } | null;
  items?: { id: string; quantity: number; unit_price: number; total_price: number; cigar: { name: string } }[];
}

interface CreditNote {
  id: string;
  credit_note_number: string;
  credit_type: string;
  amount: number;
  total_amount: number;
  reason: string;
  created_at: string;
}

interface StoreTaxSettings {
  state_code: string;
  state_name: string;
  default_cgst_rate: number;
  default_sgst_rate: number;
  default_igst_rate: number;
  default_cess_rate: number;
  cess_enabled: boolean;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { logAudit } = useFinanceAudit();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false);

  // Form states
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [creditNoteForm, setCreditNoteForm] = useState({
    type: 'full' as 'full' | 'partial',
    amount: 0,
    reason: '',
    deductPoints: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    
    const { data: orderData, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone, address, fume_points_balance),
        store:stores(name),
        items:order_items(id, quantity, unit_price, total_price, cigar:cigars(name))
      `)
      .eq('id', id)
      .single();

    if (error || !orderData) {
      toast.error('Order not found');
      navigate('/orders');
      return;
    }

    setOrder(orderData as unknown as OrderDetail);

    // Fetch credit notes for this order
    const { data: cnData } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('original_order_id', id)
      .order('created_at', { ascending: false });

    setCreditNotes(cnData || []);

    // Fetch store tax settings if store is set
    if (orderData.store_id) {
      const { data: taxData } = await supabase
        .from('store_tax_settings')
        .select('*')
        .eq('store_id', orderData.store_id)
        .single();

      if (taxData) {
        setStoreTaxSettings(taxData);
        setPlaceOfSupply(taxData.state_code);
      }
    }

    setLoading(false);
  };

  const handleFinalize = async () => {
    if (!order || !order.store_id || !placeOfSupply) {
      toast.error('Please select place of supply');
      return;
    }

    if (!storeTaxSettings) {
      toast.error('Store tax settings not configured');
      return;
    }

    setSubmitting(true);

    try {
      // Calculate taxes based on inter-state logic
      const taxCalc = calculateTax(
        order.subtotal,
        storeTaxSettings.state_code,
        placeOfSupply,
        storeTaxSettings.default_cgst_rate,
        storeTaxSettings.default_sgst_rate,
        storeTaxSettings.default_igst_rate,
        storeTaxSettings.default_cess_rate,
        storeTaxSettings.cess_enabled
      );

      // Generate invoice number
      const { data: invoiceNumber, error: invError } = await supabase
        .rpc('generate_invoice_number', { p_store_id: order.store_id });

      if (invError) throw invError;

      const supplyState = INDIAN_STATES.find(s => s.code === placeOfSupply);

      // Create snapshot of order data for immutability - serialize to JSON string then parse for proper Json type
      const snapshotData = JSON.stringify({
        items: order.items,
        customer: order.customer,
        store: order.store,
        subtotal: order.subtotal,
        taxCalc: taxCalc,
        total: order.subtotal + taxCalc.totalTax
      });

      const { error } = await supabase
        .from('orders')
        .update({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString(),
          is_finalized: true,
          finalized_at: new Date().toISOString(),
          finalized_by: user?.id,
          place_of_supply_state: supplyState?.name || null,
          place_of_supply_code: placeOfSupply,
          cgst_rate: taxCalc.cgstRate,
          sgst_rate: taxCalc.sgstRate,
          igst_rate: taxCalc.igstRate,
          cess_rate: taxCalc.cessRate,
          cgst_amount: taxCalc.cgstAmount,
          sgst_amount: taxCalc.sgstAmount,
          igst_amount: taxCalc.igstAmount,
          cess_amount: taxCalc.cessAmount,
          tax: taxCalc.totalTax,
          total: order.subtotal + taxCalc.totalTax,
          invoice_snapshot: JSON.parse(snapshotData)
        })
        .eq('id', order.id);

      if (error) throw error;

      await logAudit({
        entityType: 'order',
        entityId: order.id,
        actionType: 'finalize_invoice',
        storeId: order.store_id,
        beforeData: { is_finalized: false },
        afterData: { is_finalized: true, invoice_number: invoiceNumber }
      });

      toast.success(`Invoice ${invoiceNumber} finalized successfully`);
      setShowFinalizeDialog(false);
      fetchOrder();
    } catch (error: any) {
      toast.error(error.message || 'Failed to finalize invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!order || !voidReason.trim()) {
      toast.error('Please provide a reason for voiding');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          is_voided: true,
          voided_at: new Date().toISOString(),
          voided_by: user?.id,
          void_reason: voidReason
        })
        .eq('id', order.id);

      if (error) throw error;

      await logAudit({
        entityType: 'order',
        entityId: order.id,
        actionType: 'void_invoice',
        storeId: order.store_id,
        beforeData: { is_voided: false },
        afterData: { is_voided: true, void_reason: voidReason },
        reason: voidReason
      });

      toast.success('Invoice voided successfully');
      setShowVoidDialog(false);
      fetchOrder();
    } catch (error: any) {
      toast.error(error.message || 'Failed to void invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCreditNote = async () => {
    if (!order || !creditNoteForm.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    const amount = creditNoteForm.type === 'full' ? order.total : creditNoteForm.amount;
    if (amount <= 0 || amount > order.total) {
      toast.error('Invalid credit note amount');
      return;
    }

    setSubmitting(true);

    try {
      // Generate credit note number
      const { data: cnNumber, error: cnError } = await supabase
        .rpc('generate_credit_note_number', { p_store_id: order.store_id });

      if (cnError) throw cnError;

      // Calculate proportional tax amounts
      const ratio = amount / order.total;
      const cgstAmount = order.cgst_amount * ratio;
      const sgstAmount = order.sgst_amount * ratio;
      const igstAmount = order.igst_amount * ratio;
      const cessAmount = order.cess_amount * ratio;
      const baseAmount = amount - cgstAmount - sgstAmount - igstAmount - cessAmount;

      // Calculate points to deduct if applicable
      let pointsDeducted = 0;
      if (creditNoteForm.deductPoints && order.fume_points_earned > 0) {
        pointsDeducted = Math.round(order.fume_points_earned * ratio);
      }

      const { data: newCn, error } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: cnNumber,
          original_order_id: order.id,
          store_id: order.store_id,
          credit_type: creditNoteForm.type,
          amount: baseAmount,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          cess_amount: cessAmount,
          total_amount: amount,
          reason: creditNoteForm.reason,
          deduct_fume_points: creditNoteForm.deductPoints,
          points_deducted: pointsDeducted,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct fume points if applicable
      if (pointsDeducted > 0 && order.customer_id) {
        await supabase
          .from('customers')
          .update({ 
            fume_points_balance: (order.customer?.fume_points_balance || 0) - pointsDeducted 
          })
          .eq('id', order.customer_id);

        await supabase.from('fume_points_ledger').insert({
          customer_id: order.customer_id,
          points: -pointsDeducted,
          type: 'deduction',
          reason: `Credit note ${cnNumber}`,
          order_id: order.id,
          created_by: user?.id
        });
      }

      await logAudit({
        entityType: 'credit_note',
        entityId: newCn.id,
        actionType: 'create_credit_note',
        storeId: order.store_id,
        afterData: { credit_note_number: cnNumber, amount, reason: creditNoteForm.reason },
        reason: creditNoteForm.reason
      });

      toast.success(`Credit Note ${cnNumber} created successfully`);
      setShowCreditNoteDialog(false);
      setCreditNoteForm({ type: 'full', amount: 0, reason: '', deductPoints: false });
      fetchOrder();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create credit note');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadInvoice = () => {
    if (!order || !order.is_finalized) return;

    const invoiceData: InvoiceData = {
      orderNumber: order.invoice_number || order.order_number,
      invoiceDate: order.invoice_date ? new Date(order.invoice_date) : new Date(),
      customer: {
        name: order.customer?.name || 'Walk-in Customer',
        phone: order.customer?.phone,
        address: order.customer?.address,
        gstin: null,
        state: order.place_of_supply_state || undefined,
        stateCode: order.place_of_supply_code || undefined
      },
      shippingAddress: order.shipping_address,
      items: (order.items || []).map(item => ({
        name: item.cigar.name,
        hsn: '24021010',
        uom: 'Pcs',
        quantity: item.quantity,
        rate: item.unit_price,
        discount: 0
      })),
      subtotal: order.subtotal,
      cgst: order.cgst_amount,
      sgst: order.sgst_amount,
      igst: order.igst_amount,
      cess: order.cess_amount,
      packingCharges: 0,
      total: order.total,
      storeName: order.store?.name
    };

    const doc = generateTaxInvoice(invoiceData);
    doc.save(`Invoice-${order.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) return null;

  const isLocked = order.is_finalized;
  const isVoided = order.is_voided;
  const canFinalize = !isLocked && !isVoided && storeTaxSettings;
  const canVoid = isLocked && !isVoided && (role === 'admin' || role === 'operations');
  const canCreateCreditNote = isLocked && !isVoided;
  const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + cn.total_amount, 0);
  const netAmount = order.total - totalCreditNotes;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold">
                  {order.invoice_number || order.order_number}
                </h1>
                {isLocked && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Finalized
                  </Badge>
                )}
                {isVoided && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Voided
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {order.store?.name} • Created {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLocked && !isVoided && (
              <Button variant="outline" onClick={downloadInvoice}>
                <Download className="w-4 h-4 mr-2" /> Download Invoice
              </Button>
            )}
            {canFinalize && (
              <Button className="btn-primary" onClick={() => setShowFinalizeDialog(true)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Finalize Invoice
              </Button>
            )}
            {canCreateCreditNote && (
              <Button variant="outline" onClick={() => setShowCreditNoteDialog(true)}>
                <CreditCard className="w-4 h-4 mr-2" /> Credit Note
              </Button>
            )}
            {canVoid && (
              <Button variant="destructive" onClick={() => setShowVoidDialog(true)}>
                <Ban className="w-4 h-4 mr-2" /> Void Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Void Warning */}
        {isVoided && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">This invoice has been voided</p>
              <p className="text-sm text-muted-foreground mt-1">
                Reason: {order.void_reason} • Voided on {new Date(order.voided_at!).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Tax Settings Warning */}
        {!storeTaxSettings && !isLocked && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning">Store tax settings not configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please configure tax settings for this store before finalizing invoices.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Shipping */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Customer & Shipping</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-medium">{order.customer?.name || 'Walk-in Customer'}</p>
                  {order.customer?.phone && <p className="text-sm text-muted-foreground">{order.customer.phone}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Shipping Address</Label>
                  <p className="text-sm">{order.shipping_address || order.customer?.address || '-'}</p>
                </div>
                {order.place_of_supply_state && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Place of Supply</Label>
                    <p className="font-medium">{order.place_of_supply_state} ({order.place_of_supply_code})</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Items</h3>
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
                      <TableCell className="font-medium">{item.cigar.name}</TableCell>
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
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Credit Notes
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CN Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.map(cn => (
                      <TableRow key={cn.id}>
                        <TableCell className="font-mono">{cn.credit_note_number}</TableCell>
                        <TableCell className="capitalize">{cn.credit_type}</TableCell>
                        <TableCell className="text-muted-foreground">{cn.reason}</TableCell>
                        <TableCell>{new Date(cn.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right text-destructive">-₹{cn.total_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Invoice Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString()}</span>
                </div>
                {order.cgst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST ({order.cgst_rate}%)</span>
                    <span>₹{order.cgst_amount.toLocaleString()}</span>
                  </div>
                )}
                {order.sgst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST ({order.sgst_rate}%)</span>
                    <span>₹{order.sgst_amount.toLocaleString()}</span>
                  </div>
                )}
                {order.igst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST ({order.igst_rate}%)</span>
                    <span>₹{order.igst_amount.toLocaleString()}</span>
                  </div>
                )}
                {order.cess_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CESS ({order.cess_rate}%)</span>
                    <span>₹{order.cess_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Invoice Total</span>
                  <span className={cn(isVoided && "line-through text-muted-foreground")}>₹{order.total.toLocaleString()}</span>
                </div>
                {totalCreditNotes > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Credit Notes</span>
                      <span>-₹{totalCreditNotes.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span>Net Amount</span>
                      <span className="text-primary">₹{netAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {order.fume_points_earned > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Fume Points</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points Earned</span>
                    <span className="text-success">+{order.fume_points_earned}</span>
                  </div>
                  {order.fume_points_redeemed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Points Redeemed</span>
                      <span className="text-destructive">-{order.fume_points_redeemed}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Invoice</DialogTitle>
            <DialogDescription>
              Once finalized, the invoice will be locked and cannot be edited. Tax will be calculated based on place of supply.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {storeTaxSettings && placeOfSupply && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-medium text-sm">Tax Preview</p>
                {placeOfSupply === storeTaxSettings.state_code ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Intra-state supply: CGST + SGST will apply</p>
                    <p>CGST: {storeTaxSettings.default_cgst_rate}% | SGST: {storeTaxSettings.default_sgst_rate}%</p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>Inter-state supply: IGST will apply</p>
                    <p>IGST: {storeTaxSettings.default_igst_rate}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
            <Button className="btn-primary" onClick={handleFinalize} disabled={submitting || !placeOfSupply}>
              {submitting ? 'Processing...' : 'Finalize Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Void Invoice
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The invoice will be marked as voided but kept for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Voiding (Required)</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter reason for voiding this invoice..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={submitting || !voidReason.trim()}>
              {submitting ? 'Processing...' : 'Void Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditNoteDialog} onOpenChange={setShowCreditNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Credit Note</DialogTitle>
            <DialogDescription>
              Issue a credit note against this invoice for partial or full refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credit Type</Label>
              <Select 
                value={creditNoteForm.type} 
                onValueChange={(v: 'full' | 'partial') => setCreditNoteForm(f => ({ ...f, type: v, amount: v === 'full' ? order.total : 0 }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Credit (₹{order.total.toLocaleString()})</SelectItem>
                  <SelectItem value="partial">Partial Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {creditNoteForm.type === 'partial' && (
              <div className="space-y-2">
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  value={creditNoteForm.amount}
                  onChange={(e) => setCreditNoteForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  max={order.total}
                />
                <p className="text-xs text-muted-foreground">Max: ₹{order.total.toLocaleString()}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={creditNoteForm.reason}
                onChange={(e) => setCreditNoteForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for issuing credit note..."
                rows={2}
              />
            </div>
            {order.fume_points_earned > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Deduct Fume Points</Label>
                  <p className="text-xs text-muted-foreground">
                    {order.fume_points_earned} points were earned on this order
                  </p>
                </div>
                <Switch
                  checked={creditNoteForm.deductPoints}
                  onCheckedChange={(c) => setCreditNoteForm(f => ({ ...f, deductPoints: c }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditNoteDialog(false)}>Cancel</Button>
            <Button className="btn-primary" onClick={handleCreateCreditNote} disabled={submitting || !creditNoteForm.reason.trim()}>
              {submitting ? 'Processing...' : 'Create Credit Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
