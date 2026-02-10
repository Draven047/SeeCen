import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Save, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES } from '@/lib/indianStates';
import { useFinanceAudit } from '@/hooks/useFinanceAudit';

interface Store {
  id: string;
  name: string;
}

interface StoreTaxSettings {
  id: string;
  store_id: string;
  state_name: string;
  state_code: string;
  default_cgst_rate: number;
  default_sgst_rate: number;
  default_igst_rate: number;
  default_cess_rate: number;
  cess_enabled: boolean;
  store?: { name: string };
}

interface InvoiceSeries {
  id: string;
  store_id: string;
  prefix: string;
  current_number: number;
  financial_year: string;
  store?: { name: string };
}

export default function FinanceSettings() {
  const [stores, setStores] = useState<Store[]>([]);
  const [taxSettings, setTaxSettings] = useState<StoreTaxSettings[]>([]);
  const [invoiceSeries, setInvoiceSeries] = useState<InvoiceSeries[]>([]);
  const [creditNoteSeries, setCreditNoteSeries] = useState<InvoiceSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const { logAudit } = useFinanceAudit();

  const [taxForm, setTaxForm] = useState({
    storeId: '',
    stateCode: '',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    cessRate: 0,
    cessEnabled: false
  });

  const [seriesForm, setSeriesForm] = useState({
    storeId: '',
    invoicePrefix: 'INV',
    creditNotePrefix: 'CN'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [storesRes, taxRes, invSeriesRes, cnSeriesRes] = await Promise.all([
      supabase.from('stores').select('id, name').order('name'),
      supabase.from('store_tax_settings').select('*, store:stores(name)'),
      supabase.from('invoice_series').select('*, store:stores(name)').order('financial_year', { ascending: false }),
      supabase.from('credit_note_series').select('*, store:stores(name)').order('financial_year', { ascending: false })
    ]);

    setStores(storesRes.data || []);
    setTaxSettings(taxRes.data || []);
    setInvoiceSeries(invSeriesRes.data || []);
    setCreditNoteSeries(cnSeriesRes.data || []);
    setLoading(false);
  };

  const handleSaveTaxSettings = async () => {
    if (!taxForm.storeId || !taxForm.stateCode) {
      toast.error('Please select store and state');
      return;
    }

    const state = INDIAN_STATES.find(s => s.code === taxForm.stateCode);
    if (!state) return;

    const existing = taxSettings.find(t => t.store_id === taxForm.storeId);

    const data = {
      store_id: taxForm.storeId,
      state_name: state.name,
      state_code: state.code,
      default_cgst_rate: taxForm.cgstRate,
      default_sgst_rate: taxForm.sgstRate,
      default_igst_rate: taxForm.igstRate,
      default_cess_rate: taxForm.cessRate,
      cess_enabled: taxForm.cessEnabled
    };

    if (existing) {
      const { error } = await supabase
        .from('store_tax_settings')
        .update(data)
        .eq('id', existing.id);

      if (error) {
        toast.error('Failed to update tax settings');
        return;
      }

      await logAudit({
        entityType: 'store_tax_settings',
        entityId: existing.id,
        actionType: 'update_tax_settings',
        storeId: taxForm.storeId,
        beforeData: existing,
        afterData: data
      });
    } else {
      const { data: newSettings, error } = await supabase
        .from('store_tax_settings')
        .insert(data)
        .select()
        .single();

      if (error) {
        toast.error('Failed to create tax settings');
        return;
      }

      await logAudit({
        entityType: 'store_tax_settings',
        entityId: newSettings.id,
        actionType: 'create_tax_settings',
        storeId: taxForm.storeId,
        afterData: data
      });
    }

    toast.success('Tax settings saved');
    setShowTaxDialog(false);
    fetchData();
  };

  const handleSaveSeriesPrefix = async () => {
    if (!seriesForm.storeId) {
      toast.error('Please select a store');
      return;
    }

    // Get current FY
    const { data: fyData } = await supabase.rpc('get_current_financial_year');
    const fy = fyData || '2024-25';

    // Update or create invoice series
    const existingInv = invoiceSeries.find(s => s.store_id === seriesForm.storeId && s.financial_year === fy);
    if (existingInv) {
      await supabase
        .from('invoice_series')
        .update({ prefix: seriesForm.invoicePrefix })
        .eq('id', existingInv.id);

      await logAudit({
        entityType: 'invoice_series',
        entityId: existingInv.id,
        actionType: 'update_prefix',
        storeId: seriesForm.storeId,
        beforeData: { prefix: existingInv.prefix },
        afterData: { prefix: seriesForm.invoicePrefix }
      });
    } else {
      const { data: newSeries } = await supabase
        .from('invoice_series')
        .insert({
          store_id: seriesForm.storeId,
          prefix: seriesForm.invoicePrefix,
          current_number: 0,
          financial_year: fy
        })
        .select()
        .single();

      if (newSeries) {
        await logAudit({
          entityType: 'invoice_series',
          entityId: newSeries.id,
          actionType: 'create_series',
          storeId: seriesForm.storeId,
          afterData: { prefix: seriesForm.invoicePrefix, fy }
        });
      }
    }

    // Update or create credit note series
    const existingCn = creditNoteSeries.find(s => s.store_id === seriesForm.storeId && s.financial_year === fy);
    if (existingCn) {
      await supabase
        .from('credit_note_series')
        .update({ prefix: seriesForm.creditNotePrefix })
        .eq('id', existingCn.id);

      await logAudit({
        entityType: 'credit_note_series',
        entityId: existingCn.id,
        actionType: 'update_prefix',
        storeId: seriesForm.storeId,
        beforeData: { prefix: existingCn.prefix },
        afterData: { prefix: seriesForm.creditNotePrefix }
      });
    } else {
      const { data: newSeries } = await supabase
        .from('credit_note_series')
        .insert({
          store_id: seriesForm.storeId,
          prefix: seriesForm.creditNotePrefix,
          current_number: 0,
          financial_year: fy
        })
        .select()
        .single();

      if (newSeries) {
        await logAudit({
          entityType: 'credit_note_series',
          entityId: newSeries.id,
          actionType: 'create_series',
          storeId: seriesForm.storeId,
          afterData: { prefix: seriesForm.creditNotePrefix, fy }
        });
      }
    }

    toast.success('Series prefixes saved');
    setShowSeriesDialog(false);
    fetchData();
  };

  const openTaxDialog = (storeId?: string) => {
    if (storeId) {
      const existing = taxSettings.find(t => t.store_id === storeId);
      if (existing) {
        setTaxForm({
          storeId: existing.store_id,
          stateCode: existing.state_code,
          cgstRate: existing.default_cgst_rate,
          sgstRate: existing.default_sgst_rate,
          igstRate: existing.default_igst_rate,
          cessRate: existing.default_cess_rate,
          cessEnabled: existing.cess_enabled
        });
      }
    } else {
      setTaxForm({
        storeId: '',
        stateCode: '',
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        cessRate: 0,
        cessEnabled: false
      });
    }
    setShowTaxDialog(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Tax Settings Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" /> Store Tax Settings
            </h3>
            <p className="text-sm text-muted-foreground">Configure GST rates and state for each store</p>
          </div>
          <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => openTaxDialog()} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Tax Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Store Tax Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Select value={taxForm.storeId} onValueChange={(v) => setTaxForm(f => ({ ...f, storeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                    <SelectContent>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={taxForm.stateCode} onValueChange={(v) => setTaxForm(f => ({ ...f, stateCode: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CGST Rate (%)</Label>
                    <Input type="number" value={taxForm.cgstRate} onChange={(e) => setTaxForm(f => ({ ...f, cgstRate: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST Rate (%)</Label>
                    <Input type="number" value={taxForm.sgstRate} onChange={(e) => setTaxForm(f => ({ ...f, sgstRate: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IGST Rate (%)</Label>
                  <Input type="number" value={taxForm.igstRate} onChange={(e) => setTaxForm(f => ({ ...f, igstRate: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable CESS</Label>
                  <Switch checked={taxForm.cessEnabled} onCheckedChange={(c) => setTaxForm(f => ({ ...f, cessEnabled: c }))} />
                </div>
                {taxForm.cessEnabled && (
                  <div className="space-y-2">
                    <Label>CESS Rate (%)</Label>
                    <Input type="number" value={taxForm.cessRate} onChange={(e) => setTaxForm(f => ({ ...f, cessRate: parseFloat(e.target.value) || 0 }))} />
                  </div>
                )}
                <Button onClick={handleSaveTaxSettings} className="w-full btn-primary">
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>State</TableHead>
              <TableHead>CGST</TableHead>
              <TableHead>SGST</TableHead>
              <TableHead>IGST</TableHead>
              <TableHead>CESS</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxSettings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tax settings configured. Add settings for each store.
                </TableCell>
              </TableRow>
            ) : (
              taxSettings.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.store?.name}</TableCell>
                  <TableCell>{t.state_name} ({t.state_code})</TableCell>
                  <TableCell>{t.default_cgst_rate}%</TableCell>
                  <TableCell>{t.default_sgst_rate}%</TableCell>
                  <TableCell>{t.default_igst_rate}%</TableCell>
                  <TableCell>{t.cess_enabled ? `${t.default_cess_rate}%` : '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openTaxDialog(t.store_id)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Series Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Invoice & Credit Note Series
            </h3>
            <p className="text-sm text-muted-foreground">Configure numbering prefixes for each store</p>
          </div>
          <Dialog open={showSeriesDialog} onOpenChange={setShowSeriesDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Configure Series
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invoice Series Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Select value={seriesForm.storeId} onValueChange={(v) => setSeriesForm(f => ({ ...f, storeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                    <SelectContent>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix (e.g., BLR, HYD, MUM)</Label>
                  <Input value={seriesForm.invoicePrefix} onChange={(e) => setSeriesForm(f => ({ ...f, invoicePrefix: e.target.value.toUpperCase() }))} placeholder="INV" />
                  <p className="text-xs text-muted-foreground">Format: {seriesForm.invoicePrefix}/2024-25/000001</p>
                </div>
                <div className="space-y-2">
                  <Label>Credit Note Prefix</Label>
                  <Input value={seriesForm.creditNotePrefix} onChange={(e) => setSeriesForm(f => ({ ...f, creditNotePrefix: e.target.value.toUpperCase() }))} placeholder="CN" />
                  <p className="text-xs text-muted-foreground">Format: {seriesForm.creditNotePrefix}/2024-25/000001</p>
                </div>
                <Button onClick={handleSaveSeriesPrefix} className="w-full btn-primary">
                  <Save className="w-4 h-4 mr-2" /> Save Series
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Invoice Series</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead>Current #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceSeries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No series configured</TableCell>
                  </TableRow>
                ) : (
                  invoiceSeries.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.store?.name}</TableCell>
                      <TableCell className="font-mono">{s.prefix}</TableCell>
                      <TableCell>{s.financial_year}</TableCell>
                      <TableCell>{s.current_number}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div>
            <h4 className="font-medium mb-3">Credit Note Series</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead>Current #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditNoteSeries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No series configured</TableCell>
                  </TableRow>
                ) : (
                  creditNoteSeries.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.store?.name}</TableCell>
                      <TableCell className="font-mono">{s.prefix}</TableCell>
                      <TableCell>{s.financial_year}</TableCell>
                      <TableCell>{s.current_number}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
