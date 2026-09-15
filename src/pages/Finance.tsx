import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IndianRupee, Download, CheckCircle, Clock, AlertTriangle,
  Banknote, CreditCard, FileText, ChevronRight, Calendar,
  ArrowDownToLine, Settings, TrendingUp,
} from 'lucide-react';
import { ProfitPanel } from '@/components/finance/ProfitPanel';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PageLoading } from '@/components/ui/page-loading';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const storeId = currentStore?.id;

  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [codEntries, setCodEntries] = useState<CodEntry[]>([]);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [totalCreditNotes, setTotalCreditNotes] = useState(0);
  const [codPending, setCodPending] = useState(0);

  const fetchAll = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);

    const [invRes, cnRes, settRes, codRes] = await Promise.all([
      supabase.from('orders').select('total, is_voided').eq('is_finalized', true).eq('store_id', storeId),
      supabase.from('credit_notes').select('total_amount').eq('store_id', storeId),
      supabase.from('settlements').select('*').eq('store_id', storeId).order('settlement_date', { ascending: false }).limit(50),
      supabase.from('cod_reconciliation').select('*, order:orders(order_number, customer:customers(name))').eq('store_id', storeId).order('created_at', { ascending: false }).limit(100),
    ]);

    setTotalInvoiced((invRes.data || []).filter((i: any) => !i.is_voided).reduce((s: number, i: any) => s + Number(i.total), 0));
    setTotalCreditNotes((cnRes.data || []).reduce((s: number, cn: any) => s + Number(cn.total_amount), 0));
    setSettlements((settRes.data as unknown as Settlement[]) || []);
    const cod = (codRes.data as unknown as CodEntry[]) || [];
    setCodEntries(cod);
    setCodPending(cod.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.expected_amount) - Number(c.collected_amount)), 0));
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalSettled = settlements.filter(s => s.status === 'settled').reduce((s, st) => s + Number(st.net_amount), 0);
  const pendingSettlements = settlements.filter(s => s.status !== 'settled');
  const completedSettlements = settlements.filter(s => s.status === 'settled');

  // Current cycle estimate
  const currentCycleGross = pendingSettlements.reduce((s, st) => s + Number(st.gross_amount), 0);
  const currentCycleDeductions = pendingSettlements.reduce((s, st) => s + Number(st.commission) + Number(st.shipping_deduction) + Number(st.tds), 0);
  const currentCycleNet = currentCycleGross - currentCycleDeductions;

  if (loading) return (
    <SellerOSLayout>
      <PageLoading label="Loading finance" rows={4} />
    </SellerOSLayout>
  );

  return (
    <SellerOSLayout>
      <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{t('Finance control')}</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#17191c]">{t('Payouts')}</h1>
            <p className="text-sm text-muted-foreground mt-2">{currentStore?.name || 'Select a store'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/demo/settings')} className="min-h-[44px]">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        </div>

        {/* Current Cycle Card */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Current cycle</p>
                <p className="text-[11px] text-muted-foreground">
                  {pendingSettlements.length > 0 ? `${pendingSettlements.length} pending` : 'No pending payouts'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <Clock className="h-3 w-3 mr-1" />
              Processing
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-[10px] text-muted-foreground font-medium">Gross</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{fmt(currentCycleGross)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-destructive/5">
              <p className="text-[10px] text-muted-foreground font-medium">Deductions</p>
              <p className="text-sm font-bold text-destructive mt-0.5">-{fmt(currentCycleDeductions)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-success/5">
              <p className="text-[10px] text-muted-foreground font-medium">Estimated</p>
              <p className="text-sm font-bold text-success mt-0.5">{fmt(currentCycleNet)}</p>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Invoiced', value: fmt(totalInvoiced), icon: FileText, color: 'text-primary' },
            { label: 'Credit Notes', value: fmt(totalCreditNotes), icon: CreditCard, color: 'text-destructive' },
            { label: 'Net Settled', value: fmt(totalSettled), icon: CheckCircle, color: 'text-success' },
            { label: 'COD Pending', value: fmt(codPending), icon: AlertTriangle, color: 'text-warning' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card rounded-xl border border-border p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={cn('w-3.5 h-3.5', kpi.color)} />
                <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
              </div>
              <p className={cn('text-base font-bold', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payouts" className="space-y-4">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="payouts" className="rounded-lg text-xs min-h-[40px]">
              <Banknote className="w-3.5 h-3.5 mr-1.5" /> {t('Payouts')}
            </TabsTrigger>
            <TabsTrigger value="profit" className="rounded-lg text-xs min-h-[40px]">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> {t('Profit')}
            </TabsTrigger>
            <TabsTrigger value="cod" className="rounded-lg text-xs min-h-[40px]">
              <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> COD
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg text-xs min-h-[40px]">
              <Download className="w-3.5 h-3.5 mr-1.5" /> {t('Reports')}
            </TabsTrigger>
          </TabsList>

          {/* True P&L */}
          <TabsContent value="profit" className="space-y-3">
            {storeId && <ProfitPanel storeId={storeId} />}
          </TabsContent>

          {/* Completed Payouts */}
          <TabsContent value="payouts" className="space-y-3">
            {/* Upcoming cash calendar */}
            {(pendingSettlements.length > 0 || codPending > 0) && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{t('Cash on the way')}</h3>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pendingSettlements.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-semibold capitalize text-foreground">{s.channel} payout</p>
                        <p className="text-xs text-muted-foreground">
                          expected {format(new Date(new Date(s.settlement_date).getTime() + 7 * 24 * 60 * 60 * 1000), 'dd MMM')} · {s.orders_count} orders
                        </p>
                      </div>
                      <p className="font-bold tabular-nums text-foreground">{fmt(Number(s.net_amount))}</p>
                    </div>
                  ))}
                  {codPending > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-foreground">COD remittance due</p>
                        <p className="text-xs text-muted-foreground">pending courier reconciliation</p>
                      </div>
                      <p className="font-bold tabular-nums text-warning">{fmt(codPending)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {completedSettlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Banknote className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No completed payouts</p>
                <p className="text-xs text-muted-foreground mt-1">Settled payouts will appear here.</p>
              </div>
            ) : (
              completedSettlements.map(s => (
                <div key={s.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{fmt(s.net_amount)}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize">{s.channel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.settlement_date), 'dd MMM yyyy')} · {s.orders_count} orders
                    </p>
                    {s.reference_number && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {s.reference_number}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))
            )}
          </TabsContent>

          {/* COD Tab */}
          <TabsContent value="cod" className="space-y-3">
            {codEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <IndianRupee className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No COD entries</p>
                <p className="text-xs text-muted-foreground mt-1">Cash on delivery reconciliation will appear here.</p>
              </div>
            ) : (
              codEntries.map(c => (
                <div key={c.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{c.order?.order_number || '-'}</p>
                      <Badge variant={c.status === 'reconciled' ? 'secondary' : c.status === 'pending' ? 'outline' : 'destructive'} className="text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.order?.customer?.name || '-'}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Expected</p>
                      <p className="text-xs font-bold text-foreground">{fmt(c.expected_amount)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Collected</p>
                      <p className="text-xs font-bold text-foreground">{fmt(c.collected_amount)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Remitted</p>
                      <p className="text-xs font-bold text-foreground">{fmt(c.remitted_amount)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-3">
            {[
              { label: 'Invoice Report', desc: 'All finalized invoices', icon: FileText, onClick: () => {} },
              { label: 'Settlement Report', desc: 'Channel-wise payout summary', icon: Banknote, onClick: () => exportCSV(settlements.map(s => ({
                channel: s.channel, date: s.settlement_date, gross: s.gross_amount, commission: s.commission,
                shipping: s.shipping_deduction, tds: s.tds, net: s.net_amount, ref: s.reference_number, status: s.status
              })), 'settlements.csv') },
              { label: 'COD Reconciliation', desc: 'Cash collection vs remittance', icon: IndianRupee, onClick: () => exportCSV(codEntries.map(c => ({
                order: c.order?.order_number, customer: c.order?.customer?.name,
                expected: c.expected_amount, collected: c.collected_amount, remitted: c.remitted_amount,
                status: c.status, date: c.remittance_date
              })), 'cod-reconciliation.csv') },
              { label: 'Credit Notes', desc: 'All issued credit notes', icon: CreditCard, onClick: () => {} },
            ].map(report => (
              <button
                key={report.label}
                onClick={report.onClick}
                className="flex items-center gap-4 w-full p-4 rounded-xl border border-border bg-card hover:bg-muted/30 active:scale-[0.99] transition-all text-left min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <report.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{report.label}</p>
                  <p className="text-xs text-muted-foreground">{report.desc}</p>
                </div>
                <ArrowDownToLine className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </SellerOSLayout>
  );
}
