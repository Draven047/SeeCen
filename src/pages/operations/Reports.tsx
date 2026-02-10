import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, TrendingUp, ShoppingCart, Ban, CreditCard, Receipt, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  order_number: string;
  customer_name: string;
  store_name: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total: number;
  is_finalized: boolean;
  is_voided: boolean;
  void_reason: string | null;
  invoice_date: string | null;
  created_at: string;
}

interface CreditNoteData {
  id: string;
  credit_note_number: string;
  order_number: string;
  store_name: string;
  credit_type: string;
  amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_amount: number;
  reason: string;
  created_at: string;
}

interface GSTSummary {
  store_name: string;
  total_invoices: number;
  total_sales: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  credit_note_count: number;
  credit_note_amount: number;
  net_sales: number;
  net_cgst: number;
  net_sgst: number;
  net_igst: number;
  net_cess: number;
}

export default function Reports() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNoteData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStores();
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setStartDate(monthAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [startDate, endDate, selectedStore]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').order('name');
    setStores(data || []);
  };

  const fetchReports = async () => {
    setLoading(true);

    // Fetch invoices
    let invoiceQuery = supabase
      .from('orders')
      .select(`
        id, invoice_number, order_number, subtotal, cgst_amount, sgst_amount, igst_amount, cess_amount, total,
        is_finalized, is_voided, void_reason, invoice_date, created_at,
        customer:customers(name),
        store:stores(name)
      `)
      .eq('is_finalized', true)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (selectedStore !== 'all') {
      invoiceQuery = invoiceQuery.eq('store_id', selectedStore);
    }

    const { data: invoiceData } = await invoiceQuery;

    const formattedInvoices: InvoiceData[] = (invoiceData || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      order_number: inv.order_number,
      customer_name: inv.customer?.name || 'Walk-in',
      store_name: inv.store?.name || 'N/A',
      subtotal: Number(inv.subtotal),
      cgst_amount: Number(inv.cgst_amount),
      sgst_amount: Number(inv.sgst_amount),
      igst_amount: Number(inv.igst_amount),
      cess_amount: Number(inv.cess_amount),
      total: Number(inv.total),
      is_finalized: inv.is_finalized,
      is_voided: inv.is_voided,
      void_reason: inv.void_reason,
      invoice_date: inv.invoice_date,
      created_at: inv.created_at
    }));

    setInvoices(formattedInvoices);

    // Fetch credit notes
    let cnQuery = supabase
      .from('credit_notes')
      .select(`
        id, credit_note_number, credit_type, amount, cgst_amount, sgst_amount, igst_amount, cess_amount, total_amount, reason, created_at,
        order:orders(order_number),
        store:stores(name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (selectedStore !== 'all') {
      cnQuery = cnQuery.eq('store_id', selectedStore);
    }

    const { data: cnData } = await cnQuery;

    const formattedCNs: CreditNoteData[] = (cnData || []).map((cn: any) => ({
      id: cn.id,
      credit_note_number: cn.credit_note_number,
      order_number: cn.order?.order_number || 'N/A',
      store_name: cn.store?.name || 'N/A',
      credit_type: cn.credit_type,
      amount: Number(cn.amount),
      cgst_amount: Number(cn.cgst_amount),
      sgst_amount: Number(cn.sgst_amount),
      igst_amount: Number(cn.igst_amount),
      cess_amount: Number(cn.cess_amount),
      total_amount: Number(cn.total_amount),
      reason: cn.reason,
      created_at: cn.created_at
    }));

    setCreditNotes(formattedCNs);
    setLoading(false);
  };

  // Computed values
  const activeInvoices = invoices.filter(i => !i.is_voided);
  const voidedInvoices = invoices.filter(i => i.is_voided);

  const totalSales = activeInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalCGST = activeInvoices.reduce((sum, i) => sum + i.cgst_amount, 0);
  const totalSGST = activeInvoices.reduce((sum, i) => sum + i.sgst_amount, 0);
  const totalIGST = activeInvoices.reduce((sum, i) => sum + i.igst_amount, 0);
  const totalCESS = activeInvoices.reduce((sum, i) => sum + i.cess_amount, 0);

  const totalCreditNoteAmount = creditNotes.reduce((sum, cn) => sum + cn.total_amount, 0);
  const cnCGST = creditNotes.reduce((sum, cn) => sum + cn.cgst_amount, 0);
  const cnSGST = creditNotes.reduce((sum, cn) => sum + cn.sgst_amount, 0);
  const cnIGST = creditNotes.reduce((sum, cn) => sum + cn.igst_amount, 0);
  const cnCESS = creditNotes.reduce((sum, cn) => sum + cn.cess_amount, 0);

  const netSales = totalSales - totalCreditNoteAmount;

  // GST Summary by store
  const gstSummary: GSTSummary[] = (() => {
    const storeMap = new Map<string, GSTSummary>();

    activeInvoices.forEach(inv => {
      const existing = storeMap.get(inv.store_name) || {
        store_name: inv.store_name,
        total_invoices: 0,
        total_sales: 0,
        cgst: 0, sgst: 0, igst: 0, cess: 0,
        credit_note_count: 0, credit_note_amount: 0,
        net_sales: 0, net_cgst: 0, net_sgst: 0, net_igst: 0, net_cess: 0
      };
      existing.total_invoices++;
      existing.total_sales += inv.total;
      existing.cgst += inv.cgst_amount;
      existing.sgst += inv.sgst_amount;
      existing.igst += inv.igst_amount;
      existing.cess += inv.cess_amount;
      storeMap.set(inv.store_name, existing);
    });

    creditNotes.forEach(cn => {
      const existing = storeMap.get(cn.store_name);
      if (existing) {
        existing.credit_note_count++;
        existing.credit_note_amount += cn.total_amount;
        existing.net_cgst = existing.cgst - cn.cgst_amount;
        existing.net_sgst = existing.sgst - cn.sgst_amount;
        existing.net_igst = existing.igst - cn.igst_amount;
        existing.net_cess = existing.cess - cn.cess_amount;
      }
    });

    storeMap.forEach(s => {
      s.net_sales = s.total_sales - s.credit_note_amount;
      s.net_cgst = s.cgst - creditNotes.filter(cn => cn.store_name === s.store_name).reduce((sum, cn) => sum + cn.cgst_amount, 0);
      s.net_sgst = s.sgst - creditNotes.filter(cn => cn.store_name === s.store_name).reduce((sum, cn) => sum + cn.sgst_amount, 0);
      s.net_igst = s.igst - creditNotes.filter(cn => cn.store_name === s.store_name).reduce((sum, cn) => sum + cn.igst_amount, 0);
      s.net_cess = s.cess - creditNotes.filter(cn => cn.store_name === s.store_name).reduce((sum, cn) => sum + cn.cess_amount, 0);
    });

    return Array.from(storeMap.values());
  })();

  const downloadExcel = (type: 'invoices' | 'credit_notes' | 'voided' | 'gst_summary') => {
    let data: any[] = [];
    let sheetName = '';

    switch (type) {
      case 'invoices':
        data = activeInvoices.map(i => ({
          'Invoice Number': i.invoice_number || i.order_number,
          'Customer': i.customer_name,
          'Store': i.store_name,
          'Invoice Date': i.invoice_date ? new Date(i.invoice_date).toLocaleDateString() : '',
          'Subtotal': i.subtotal,
          'CGST': i.cgst_amount,
          'SGST': i.sgst_amount,
          'IGST': i.igst_amount,
          'CESS': i.cess_amount,
          'Total': i.total
        }));
        sheetName = 'Invoice Register';
        break;
      case 'credit_notes':
        data = creditNotes.map(cn => ({
          'Credit Note Number': cn.credit_note_number,
          'Original Order': cn.order_number,
          'Store': cn.store_name,
          'Type': cn.credit_type,
          'Reason': cn.reason,
          'Date': new Date(cn.created_at).toLocaleDateString(),
          'Amount': cn.amount,
          'CGST': cn.cgst_amount,
          'SGST': cn.sgst_amount,
          'IGST': cn.igst_amount,
          'CESS': cn.cess_amount,
          'Total': cn.total_amount
        }));
        sheetName = 'Credit Note Register';
        break;
      case 'voided':
        data = voidedInvoices.map(i => ({
          'Invoice Number': i.invoice_number || i.order_number,
          'Customer': i.customer_name,
          'Store': i.store_name,
          'Invoice Date': i.invoice_date ? new Date(i.invoice_date).toLocaleDateString() : '',
          'Void Reason': i.void_reason,
          'Total': i.total
        }));
        sheetName = 'Voided Invoices';
        break;
      case 'gst_summary':
        data = gstSummary.map(s => ({
          'Store': s.store_name,
          'Total Invoices': s.total_invoices,
          'Gross Sales': s.total_sales,
          'CGST': s.cgst,
          'SGST': s.sgst,
          'IGST': s.igst,
          'CESS': s.cess,
          'Credit Notes': s.credit_note_count,
          'Credit Note Amount': s.credit_note_amount,
          'Net Sales': s.net_sales,
          'Net CGST': s.net_cgst,
          'Net SGST': s.net_sgst,
          'Net IGST': s.net_igst,
          'Net CESS': s.net_cess
        }));
        sheetName = 'GST Summary';
        break;
    }

    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.toLowerCase().replace(/ /g, '_')}_${startDate}_${endDate}.xlsx`);
    toast.success('Report downloaded');
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-48">
          <Label className="mb-2 block">Store</Label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="bg-input">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="mb-2 block">Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-input" />
        </div>
        <div className="w-48">
          <Label className="mb-2 block">End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-input" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Receipt className="w-4 h-4" /> Gross Sales
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-muted-foreground">{activeInvoices.length} invoices</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CreditCard className="w-4 h-4" /> Credit Notes
          </div>
          <p className="text-xl font-bold text-destructive">-{formatCurrency(totalCreditNoteAmount)}</p>
          <p className="text-xs text-muted-foreground">{creditNotes.length} notes</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" /> Net Sales
          </div>
          <p className="text-xl font-bold text-success">{formatCurrency(netSales)}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Ban className="w-4 h-4" /> Voided
          </div>
          <p className="text-xl font-bold text-warning">{voidedInvoices.length}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(voidedInvoices.reduce((s, i) => s + i.total, 0))}</p>
        </div>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Invoice Register
          </TabsTrigger>
          <TabsTrigger value="credit_notes" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Credit Notes
          </TabsTrigger>
          <TabsTrigger value="voided" className="flex items-center gap-2">
            <Ban className="w-4 h-4" /> Voided Invoices
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> GST Summary
          </TabsTrigger>
        </TabsList>

        {/* Invoice Register */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => downloadExcel('invoices')} className="btn-primary">
              <Download className="w-4 h-4 mr-2" /> Download Invoice Register
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : activeInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No invoices for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  activeInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number || inv.order_number}</TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell>{inv.store_name}</TableCell>
                      <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.subtotal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(inv.cgst_amount + inv.sgst_amount + inv.igst_amount + inv.cess_amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Credit Notes */}
        <TabsContent value="credit_notes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => downloadExcel('credit_notes')} className="btn-primary">
              <Download className="w-4 h-4 mr-2" /> Download Credit Note Register
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CN Number</TableHead>
                  <TableHead>Original Invoice</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : creditNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No credit notes for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  creditNotes.map(cn => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono">{cn.credit_note_number}</TableCell>
                      <TableCell>{cn.order_number}</TableCell>
                      <TableCell>{cn.store_name}</TableCell>
                      <TableCell className="capitalize">{cn.credit_type}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{cn.reason}</TableCell>
                      <TableCell>{new Date(cn.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">-{formatCurrency(cn.total_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Voided Invoices */}
        <TabsContent value="voided" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => downloadExcel('voided')} className="btn-primary">
              <Download className="w-4 h-4 mr-2" /> Download Voided List
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Void Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : voidedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No voided invoices for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  voidedInvoices.map(inv => (
                    <TableRow key={inv.id} className="opacity-60">
                      <TableCell className="font-medium line-through">{inv.invoice_number || inv.order_number}</TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell>{inv.store_name}</TableCell>
                      <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-destructive">{inv.void_reason}</TableCell>
                      <TableCell className="text-right line-through">{formatCurrency(inv.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* GST Summary */}
        <TabsContent value="gst" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => downloadExcel('gst_summary')} className="btn-primary">
              <Download className="w-4 h-4 mr-2" /> Download GST Summary
            </Button>
          </div>
          
          {/* Tax totals card */}
          <div className="glass-card p-6 rounded-xl">
            <h3 className="font-semibold mb-4">Tax Summary (Net of Credit Notes)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CGST</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCGST - cnCGST)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SGST</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSGST - cnSGST)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IGST</p>
                <p className="text-lg font-semibold">{formatCurrency(totalIGST - cnIGST)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CESS</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCESS - cnCESS)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total GST</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency((totalCGST + totalSGST + totalIGST + totalCESS) - (cnCGST + cnSGST + cnIGST + cnCESS))}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Credit Notes</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : gstSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No data for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {gstSummary.map(s => (
                      <TableRow key={s.store_name}>
                        <TableCell className="font-medium">{s.store_name}</TableCell>
                        <TableCell className="text-right">{s.total_invoices}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.total_sales)}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {s.credit_note_count > 0 ? `-${formatCurrency(s.credit_note_amount)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(s.net_sales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.net_cgst)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.net_sgst)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.net_igst)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{activeInvoices.length}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalSales)}</TableCell>
                      <TableCell className="text-right text-destructive">-{formatCurrency(totalCreditNoteAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(netSales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCGST - cnCGST)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalSGST - cnSGST)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalIGST - cnIGST)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
