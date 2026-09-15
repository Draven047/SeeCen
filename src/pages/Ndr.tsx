import { useCallback, useEffect, useMemo, useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/page-loading';
import {
  AlertTriangle, CheckCircle2, Clock, MessageCircle, PhoneOff,
  RefreshCw, RotateCcw, Scale, Truck, User, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { orderMessage, waLink } from '@/lib/whatsapp';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

interface NdrRecord {
  id: string;
  order_id: string;
  reason: string;
  attempts: number;
  status: 'action_required' | 'reattempt_scheduled' | 'rto_initiated' | 'resolved';
  courier_remark: string | null;
  last_attempt_at: string;
  order?: {
    id: string;
    order_number: string;
    total: number;
    payment_type: string;
    shipping_address: string | null;
    customer?: { name: string | null; phone: string | null } | null;
  } | null;
}

interface CourierDispute {
  id: string;
  order_number: string;
  courier: string;
  type: string;
  status: string;
  claimed_amount: number;
  notes: string | null;
  opened_at: string;
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  weight_dispute: 'Weight dispute',
  damaged: 'Damaged in transit',
  lost: 'Lost shipment',
};

const STATUS_META: Record<NdrRecord['status'], { label: string; className: string }> = {
  action_required: { label: 'Action required', className: 'bg-destructive/10 text-destructive' },
  reattempt_scheduled: { label: 'Reattempt scheduled', className: 'bg-warning/10 text-warning' },
  rto_initiated: { label: 'RTO initiated', className: 'bg-muted text-muted-foreground' },
  resolved: { label: 'Delivered', className: 'bg-success/10 text-success' },
};

function timeAgo(dateStr: string): string {
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (60 * 60 * 1000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Ndr() {
  const { t } = useTranslation();
  const { currentStore } = useStore();
  const storeId = currentStore?.id;
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<NdrRecord[]>([]);
  const [disputes, setDisputes] = useState<CourierDispute[]>([]);
  const [showAll, setShowAll] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const [ndrRes, disputeRes] = await Promise.all([
      supabase
        .from('ndr_records')
        .select('*, order:orders(*)')
        .eq('store_id', storeId)
        .order('last_attempt_at', { ascending: false }),
      supabase
        .from('courier_disputes')
        .select('*')
        .eq('store_id', storeId)
        .order('opened_at', { ascending: false }),
    ]);
    setRecords((ndrRes.data || []) as NdrRecord[]);
    setDisputes((disputeRes.data || []) as CourierDispute[]);
    setLoading(false);
  }, [storeId]);

  const resolveDispute = async (dispute: CourierDispute, outcome: 'won' | 'lost') => {
    const { error } = await supabase.from('courier_disputes').update({ status: outcome }).eq('id', dispute.id);
    if (error) { toast.error('Update failed'); return; }
    toast.success(outcome === 'won' ? `Claim won — ${fmt(Number(dispute.claimed_amount))} recovered` : 'Claim marked lost');
    fetchRecords();
  };

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const active = useMemo(
    () => records.filter((r) => ['action_required', 'reattempt_scheduled'].includes(r.status)),
    [records]
  );
  const visible = showAll ? records : active;

  const stats = useMemo(() => ({
    actionRequired: records.filter((r) => r.status === 'action_required').length,
    reattempts: records.filter((r) => r.status === 'reattempt_scheduled').length,
    rto: records.filter((r) => r.status === 'rto_initiated').length,
    codAtRisk: active
      .filter((r) => r.order?.payment_type === 'cod')
      .reduce((s, r) => s + Number(r.order?.total || 0), 0),
  }), [records, active]);

  const updateRecord = async (record: NdrRecord, ndrStatus: NdrRecord['status'], orderStatus: string, message: string, extraNdr: Record<string, unknown> = {}) => {
    const [ndrRes, orderRes] = await Promise.all([
      supabase.from('ndr_records').update({ status: ndrStatus, ...extraNdr }).eq('id', record.id),
      supabase.from('orders').update(
        orderStatus === 'delivered'
          ? { fulfillment_status: orderStatus, delivered_at: new Date().toISOString() }
          : { fulfillment_status: orderStatus }
      ).eq('id', record.order_id),
    ]);
    if (ndrRes.error || orderRes.error) { toast.error('Update failed'); return; }
    toast.success(message);
    fetchRecords();
  };

  const handleReattempt = (record: NdrRecord) =>
    updateRecord(record, 'reattempt_scheduled', 'in_transit', 'Reattempt scheduled with the courier', {
      attempts: record.attempts + 1,
      last_attempt_at: new Date().toISOString(),
    });

  const handleRto = (record: NdrRecord) =>
    updateRecord(record, 'rto_initiated', 'rto', 'Return-to-origin initiated');

  const handleDelivered = (record: NdrRecord) =>
    updateRecord(record, 'resolved', 'delivered', 'Marked as delivered');

  const openWhatsApp = (record: NdrRecord) => {
    const link = waLink(
      record.order?.customer?.phone,
      orderMessage('ndr', {
        customerName: record.order?.customer?.name,
        orderNumber: record.order?.order_number || record.order_id,
        storeName: currentStore?.name,
      })
    );
    if (!link) { toast.error('No phone number on this order'); return; }
    window.open(link, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <SellerOSLayout>
        <PageLoading label="Loading delivery exceptions" rows={3} />
      </SellerOSLayout>
    );
  }

  return (
    <SellerOSLayout>
      <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
        {/* Header */}
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{t('Delivery exceptions')}</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#17191c]">{t('NDR Workbench')}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Failed deliveries for {currentStore?.name || 'your store'} — act before they turn into returns.
              </p>
            </div>
            <Button variant="outline" size="sm" className="min-h-[44px] gap-1.5" onClick={fetchRecords}>
              <RefreshCw className="h-3.5 w-3.5" /> {t('Refresh')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs font-semibold text-muted-foreground">{t('Action required')}</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{stats.actionRequired}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{t('Reattempts in progress')}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.reattempts}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{t('RTO initiated')}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.rto}</p>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs font-semibold text-muted-foreground">{t('COD value at risk')}</p>
            <p className="mt-1 text-2xl font-bold text-warning">{fmt(stats.codAtRisk)}</p>
          </div>
        </div>

        {/* Queue */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-bold text-foreground">
              {showAll ? `All records (${records.length})` : `Needs action (${active.length})`}
            </h2>
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {showAll ? t('Show active only') : t('Show all')}
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-success/60" />
              <p className="text-sm font-medium text-foreground">No failed deliveries waiting on you</p>
              <p className="mt-1 text-xs text-muted-foreground">New courier exceptions will land here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((record) => {
                const meta = STATUS_META[record.status];
                const isActive = ['action_required', 'reattempt_scheduled'].includes(record.status);
                const cod = record.order?.payment_type === 'cod';
                return (
                  <div key={record.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {record.order?.order_number || record.order_id}
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', meta.className)}>
                          {meta.label}
                        </span>
                        {cod && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold text-warning border-warning/40">
                            COD {fmt(Number(record.order?.total || 0))}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {timeAgo(record.last_attempt_at)} · attempt {record.attempts}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <User className="h-3 w-3" /> {record.order?.customer?.name || 'Walk-in'}
                        </span>
                        <span className="flex items-center gap-1">
                          <PhoneOff className="h-3 w-3" /> {record.reason}
                        </span>
                        {record.courier_remark && (
                          <span className="italic">“{record.courier_remark}”</span>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button size="sm" className="h-8 gap-1 px-3 text-[11px] font-bold" onClick={() => handleReattempt(record)}>
                          <Truck className="h-3 w-3" /> {t('Reattempt')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 px-3 text-[11px] font-bold text-[#25D366] hover:text-[#1da851]"
                          onClick={() => openWhatsApp(record)}
                        >
                          <MessageCircle className="h-3 w-3" /> {t('Ask customer')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1 px-3 text-[11px] font-bold" onClick={() => handleDelivered(record)}>
                          <CheckCircle2 className="h-3 w-3" /> {t('Delivered')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 px-3 text-[11px] font-bold text-destructive hover:text-destructive"
                          onClick={() => handleRto(record)}
                        >
                          <RotateCcw className="h-3 w-3" /> {t('RTO')}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Courier disputes */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">{t('Courier disputes')}</h2>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {disputes.filter(d => d.status === 'open').length} open · {fmt(disputes.filter(d => d.status === 'open').reduce((s, d) => s + Number(d.claimed_amount), 0))} claimed
            </span>
          </div>
          {disputes.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No disputes with couriers right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {disputes.map((dispute) => (
                <div key={dispute.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-foreground">{dispute.order_number}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {DISPUTE_TYPE_LABELS[dispute.type] || dispute.type}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        dispute.status === 'open' && 'bg-warning/10 text-warning',
                        dispute.status === 'won' && 'bg-success/10 text-success',
                        dispute.status === 'lost' && 'bg-destructive/10 text-destructive',
                      )}>
                        {dispute.status}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{fmt(Number(dispute.claimed_amount))}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{dispute.courier}{dispute.notes ? ` · ${dispute.notes}` : ''}</p>
                  </div>
                  {dispute.status === 'open' && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-3 text-[11px] font-bold text-success hover:text-success" onClick={() => resolveDispute(dispute, 'won')}>
                        <CheckCircle2 className="h-3 w-3" /> Won
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-3 text-[11px] font-bold text-destructive hover:text-destructive" onClick={() => resolveDispute(dispute, 'lost')}>
                        <XCircle className="h-3 w-3" /> Lost
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playbook note */}
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <span className="font-semibold text-foreground">Playbook:</span> confirm with the customer on
            WhatsApp first — most failed deliveries are bad timing, not refusals. Reattempt within 24h;
            initiate RTO only after two failed attempts to protect your COD cash flow.
          </p>
        </div>
      </div>
    </SellerOSLayout>
  );
}
