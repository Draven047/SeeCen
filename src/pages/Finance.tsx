import { useEffect, useState, useMemo, useCallback } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, FileText, CreditCard, Banknote, Settings, Download,
  Building2, Receipt, IndianRupee, CheckCircle, Clock, AlertTriangle,
  Loader2, Save, Truck, ShoppingCart, Globe, Store
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CHANNEL_CONFIG, type SalesChannel } from '@/lib/channelConnectors';

// CSV export utility
function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

interface FinanceSettings {
  id?: string;
  store_id: string;
  bank_name: string; account_number: string; ifsc_code: string;
  account_holder: string; upi_id: string;
  invoice_footer: string; terms_and_conditions: string; gstin: string;
}

interface InvoiceRow {
  id: string; order_number: string; invoice_number: string | null; invoice_date: string | null;
  total: number; cgst_amount: number; sgst_amount: number; igst_amount: number; cess_amount: number;
  is_finalized: boolean; is_voided: boolean;
  customer?: { name: string } | null; store?: { name: string } | null;
}

interface CreditNoteRow {
  id: string; credit_note_number: string; credit_type: string; amount: number;
  total_amount: number; reason: string; created_at: string;
  order?: { order_number: string } | null;
}

interface Settlement {
  id: string; channel: string; settlement_date: string; gross_amount: number;
  commission: number; shipping_deduction: number; tds: number; net_amount: number;
  reference_number: string | null; status: string; orders_count: number;
}

interface CodEntry {
  id: string; expected_amount: number; collected_amount: number;
  remitted_amount: number; status: string; remittance_date: string | null; notes: string | null;
  order?: { order_number: string; customer?: { name: string } | null } | null;
}

export default function Finance() {
  const { user, role } = useAuth();
  const { currentStore, stores } = useStore();
  const canEdit = role === 'admin' || role === 'finance';

  const [loading, setLoading] = useState(true);
  const [finSettings, setFinSettings] = useState<FinanceSettings | null>(null);
  const [finForm, setFinForm] = useState<FinanceSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNoteRow[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [codEntries, setCodEntries] = useState<CodEntry[]>([]);

  // Tax settings from store_tax_settings
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [taxForm, setTaxForm] = useState<any>(null);

  const storeId = currentStore?.id;

  const fetchAll = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);

    const [finRes, invRes, cnRes, settRes, codRes, taxRes] = await Promise.all([
      supabase.from('store_finance_settings').select('*').eq('store_id', storeId).maybeSingle(),
      supabase.from('orders').select('id, order_number, invoice_number, invoice_date, total, cgst_amount, sgst_amount, igst_amount, cess_amount, is_finalized, is_voided, customer:customers(name), store:stores(name)')
        .eq('is_finalized', true).eq('store_id', storeId).order('invoice_date', { ascending: false }).limit(100),
      supabase.from('credit_notes').select('*, order:orders(order_number)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(100),
      supabase.from('settlements').select('*').eq('store_id', storeId).order('settlement_date', { ascending: false }).limit(50),
      supabase.from('cod_reconciliation').select('*, order:orders(order_number, customer:customers(name))').eq('store_id', storeId).order('created_at', { ascending: false }).limit(100),
      supabase.from('store_tax_settings').select('*').eq('store_id', storeId).maybeSingle(),
    ]);

    if (finRes.data) {
      setFinSettings(finRes.data as unknown as FinanceSettings);
      setFinForm(finRes.data as unknown as FinanceSettings);
    } else {
      const empty: FinanceSettings = { store_id: storeId, bank_name: '', account_number: '', ifsc_code: '', account_holder: '', upi_id: '', invoice_footer: '', terms_and_conditions: '', gstin: '' };
      setFinSettings(null);
      setFinForm(empty);
    }
    setInvoices((invRes.data as unknown as InvoiceRow[]) || []);
    setCreditNotes((cnRes.data as unknown as CreditNoteRow[]) || []);
    setSettlements((settRes.data as unknown as Settlement[]) || []);
    setCodEntries((codRes.data as unknown as CodEntry[]) || []);
    if (taxRes.data) { setTaxSettings(taxRes.data); setTaxForm({ ...taxRes.data }); }
    else { setTaxSettings(null); setTaxForm(null); }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveFinanceSettings = async () => {
    if (!finForm || !canEdit) return;
    setSaving(true);
    try {
      if (finSettings?.id) {
        const { error } = await supabase.from('store_finance_settings').update(finForm).eq('id', finSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_finance_settings').insert(finForm);
        if (error) throw error;
      }
      toast.success('Finance settings saved');
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const saveTaxSettings = async () => {
    if (!taxForm || !canEdit || !storeId) return;
    setSaving(true);
    try {
      if (taxSettings?.id) {
        const { error } = await supabase.from('store_tax_settings').update(taxForm).eq('id', taxSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_tax_settings').insert({ ...taxForm, store_id: storeId });
        if (error) throw error;
      }
      toast.success('Tax settings saved');
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  // Stats
  const totalInvoiced = invoices.filter(i => !i.is_voided).reduce((s, i) => s + Number(i.total), 0);
  const totalCreditNotes = creditNotes.reduce((s, cn) => s + Number(cn.total_amount), 0);
  const totalSettled = settlements.filter(s => s.status === 'settled').reduce((s, st) => s + Number(st.net_amount), 0);
  const codPending = codEntries.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.expected_amount) - Number(c.collected_amount)), 0);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-display">Finance</h1>
            <p className="text-muted-foreground text-sm mt-1">{currentStore?.name || 'Select a store'} — Revenue, GST, settlements & reconciliation</p>
          </div>
          {!canEdit && <Badge variant="outline" className="text-xs">View Only</Badge>}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoiced', value: fmt(totalInvoiced), icon: Receipt, color: 'text-primary' },
            { label: 'Credit Notes', value: fmt(totalCreditNotes), icon: CreditCard, color: 'text-destructive' },
            { label: 'Net Settled', value: fmt(totalSettled), icon: Banknote, color: 'text-success' },
            { label: 'COD Pending', value: fmt(codPending), icon: AlertTriangle, color: 'text-warning' },
          ].map(kpi => (
            <div key={kpi.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
              <p className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="invoices">
          <TabsList className="flex-wrap">
            <TabsTrigger value="invoices"><FileText className="w-3 h-3 mr-1" /> Invoices</TabsTrigger>
            <TabsTrigger value="credit_notes"><CreditCard className="w-3 h-3 mr-1" /> Credit Notes</TabsTrigger>
            <TabsTrigger value="settlements"><Banknote className="w-3 h-3 mr-1" /> Settlements</TabsTrigger>
            <TabsTrigger value="cod"><Truck className="w-3 h-3 mr-1" /> COD Ledger</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-3 h-3 mr-1" /> Settings</TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCSV(invoices.map(i => ({
                invoice_number: i.invoice_number, order: i.order_number, customer: i.customer?.name,
                total: i.total, cgst: i.cgst_amount, sgst: i.sgst_amount, igst: i.igst_amount, cess: i.cess_amount,
                date: i.invoice_date, voided: i.is_voided
              })), 'invoices.csv')}>
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>Cess</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number || '-'}</TableCell>
                      <TableCell className="text-sm">{inv.order_number}</TableCell>
                      <TableCell className="text-sm">{inv.customer?.name || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yy') : '-'}</TableCell>
                      <TableCell className="text-sm">{fmt(inv.cgst_amount)}</TableCell>
                      <TableCell className="text-sm">{fmt(inv.sgst_amount)}</TableCell>
                      <TableCell className="text-sm">{fmt(inv.igst_amount)}</TableCell>
                      <TableCell className="text-sm">{fmt(inv.cess_amount)}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(inv.total)}</TableCell>
                      <TableCell>
                        {inv.is_voided ? <Badge variant="destructive" className="text-[10px]">Voided</Badge>
                          : <Badge variant="success" className="text-[10px]">Active</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No finalized invoices yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Credit Notes Tab */}
          <TabsContent value="credit_notes" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCSV(creditNotes.map(cn => ({
                credit_note: cn.credit_note_number, order: cn.order?.order_number, type: cn.credit_type,
                amount: cn.amount, total: cn.total_amount, reason: cn.reason, date: cn.created_at
              })), 'credit-notes.csv')}>
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CN #</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map(cn => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono text-sm">{cn.credit_note_number}</TableCell>
                      <TableCell className="text-sm">{cn.order?.order_number || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{cn.credit_type}</Badge></TableCell>
                      <TableCell className="text-sm">{fmt(cn.amount)}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(cn.total_amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{cn.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(cn.created_at), 'dd MMM yy')}</TableCell>
                    </TableRow>
                  ))}
                  {creditNotes.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No credit notes</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Settlements Tab */}
          <TabsContent value="settlements" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCSV(settlements.map(s => ({
                channel: s.channel, date: s.settlement_date, gross: s.gross_amount, commission: s.commission,
                shipping: s.shipping_deduction, tds: s.tds, net: s.net_amount, ref: s.reference_number, status: s.status, orders: s.orders_count
              })), 'settlements.csv')}>
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Shipping</TableHead>
                    <TableHead>TDS</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map(s => {
                    const chCfg = CHANNEL_CONFIG[(s.channel || 'in_store') as SalesChannel] || CHANNEL_CONFIG.in_store;
                    return (
                      <TableRow key={s.id}>
                        <TableCell><Badge variant="secondary" className={cn('text-[10px]', chCfg.color)}>{chCfg.label}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(s.settlement_date), 'dd MMM yy')}</TableCell>
                        <TableCell className="text-sm">{s.orders_count}</TableCell>
                        <TableCell className="text-sm">{fmt(s.gross_amount)}</TableCell>
                        <TableCell className="text-sm text-destructive">-{fmt(s.commission)}</TableCell>
                        <TableCell className="text-sm text-destructive">-{fmt(s.shipping_deduction)}</TableCell>
                        <TableCell className="text-sm text-destructive">-{fmt(s.tds)}</TableCell>
                        <TableCell className="text-sm font-medium">{fmt(s.net_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'settled' ? 'success' : 'outline'} className="text-[10px]">
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{s.reference_number || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {settlements.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No settlements yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* COD Ledger Tab */}
          <TabsContent value="cod" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCSV(codEntries.map(c => ({
                order: c.order?.order_number, customer: c.order?.customer?.name,
                expected: c.expected_amount, collected: c.collected_amount, remitted: c.remitted_amount,
                status: c.status, remittance_date: c.remittance_date, notes: c.notes
              })), 'cod-reconciliation.csv')}>
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Remitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remittance Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codEntries.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.order?.order_number || '-'}</TableCell>
                      <TableCell className="text-sm">{c.order?.customer?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{fmt(c.expected_amount)}</TableCell>
                      <TableCell className="text-sm">{fmt(c.collected_amount)}</TableCell>
                      <TableCell className="text-sm">{fmt(c.remitted_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'reconciled' ? 'secondary' : c.status === 'pending' ? 'outline' : 'destructive'} className="text-[10px]">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.remittance_date || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{c.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {codEntries.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No COD entries</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {!canEdit && (
              <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Only Finance/Admin roles can edit these settings.
              </div>
            )}

            {/* GST / Tax Settings */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><IndianRupee className="w-4 h-4" /> GST & Tax Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {taxForm ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><Label>State Name</Label><Input value={taxForm.state_name || ''} onChange={e => setTaxForm((p: any) => ({ ...p, state_name: e.target.value }))} disabled={!canEdit} /></div>
                      <div><Label>State Code</Label><Input value={taxForm.state_code || ''} onChange={e => setTaxForm((p: any) => ({ ...p, state_code: e.target.value }))} disabled={!canEdit} /></div>
                      <div><Label>CGST Rate (%)</Label><Input type="number" value={taxForm.default_cgst_rate || 0} onChange={e => setTaxForm((p: any) => ({ ...p, default_cgst_rate: parseFloat(e.target.value) }))} disabled={!canEdit} /></div>
                      <div><Label>SGST Rate (%)</Label><Input type="number" value={taxForm.default_sgst_rate || 0} onChange={e => setTaxForm((p: any) => ({ ...p, default_sgst_rate: parseFloat(e.target.value) }))} disabled={!canEdit} /></div>
                      <div><Label>IGST Rate (%)</Label><Input type="number" value={taxForm.default_igst_rate || 0} onChange={e => setTaxForm((p: any) => ({ ...p, default_igst_rate: parseFloat(e.target.value) }))} disabled={!canEdit} /></div>
                      <div><Label>Cess Rate (%)</Label><Input type="number" value={taxForm.default_cess_rate || 0} onChange={e => setTaxForm((p: any) => ({ ...p, default_cess_rate: parseFloat(e.target.value) }))} disabled={!canEdit} /></div>
                    </div>
                    {canEdit && <Button onClick={saveTaxSettings} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save Tax Settings</Button>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No tax settings configured for this store. {canEdit ? 'Configure in Admin → Store Management.' : ''}</p>
                )}
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Bank Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {finForm && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div><Label>Bank Name</Label><Input value={finForm.bank_name} onChange={e => setFinForm(p => p ? { ...p, bank_name: e.target.value } : p)} disabled={!canEdit} /></div>
                      <div><Label>Account Number</Label><Input value={finForm.account_number} onChange={e => setFinForm(p => p ? { ...p, account_number: e.target.value } : p)} disabled={!canEdit} /></div>
                      <div><Label>IFSC Code</Label><Input value={finForm.ifsc_code} onChange={e => setFinForm(p => p ? { ...p, ifsc_code: e.target.value } : p)} disabled={!canEdit} /></div>
                      <div><Label>Account Holder</Label><Input value={finForm.account_holder} onChange={e => setFinForm(p => p ? { ...p, account_holder: e.target.value } : p)} disabled={!canEdit} /></div>
                      <div><Label>UPI ID</Label><Input value={finForm.upi_id} onChange={e => setFinForm(p => p ? { ...p, upi_id: e.target.value } : p)} disabled={!canEdit} /></div>
                      <div><Label>GSTIN</Label><Input value={finForm.gstin} onChange={e => setFinForm(p => p ? { ...p, gstin: e.target.value } : p)} disabled={!canEdit} /></div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Invoice Settings */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Invoice Footer & T&C</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {finForm && (
                  <>
                    <div><Label>Invoice Footer</Label><Textarea value={finForm.invoice_footer} onChange={e => setFinForm(p => p ? { ...p, invoice_footer: e.target.value } : p)} disabled={!canEdit} rows={3} placeholder="Thank you for your business!" /></div>
                    <div><Label>Terms & Conditions</Label><Textarea value={finForm.terms_and_conditions} onChange={e => setFinForm(p => p ? { ...p, terms_and_conditions: e.target.value } : p)} disabled={!canEdit} rows={4} placeholder="1. All sales are final..." /></div>
                    {canEdit && <Button onClick={saveFinanceSettings} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save Finance Settings</Button>}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
