import { useEffect, useState, useCallback } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MessageSquareWarning, Star, RotateCcw, ChevronRight,
  Calendar, Filter, Package, User,
} from 'lucide-react';
import { format } from 'date-fns';
import { PageLoading } from '@/components/ui/page-loading';

const tabs = [
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { id: 'reviews', label: 'Reviews', icon: Star },
] as const;

type TabId = typeof tabs[number]['id'];

const statusFilters = ['all', 'pending', 'approved', 'completed', 'rejected'] as const;

interface ReturnRequest {
  id: string;
  reason: string;
  status: string;
  return_type: string;
  refund_amount: number;
  created_at: string;
  order?: { order_number: string } | null;
  customer?: { name: string } | null;
}

export default function Feedback() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('returns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = useCallback(async () => {
    if (!currentStore) { setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('return_requests')
      .select('id, reason, status, return_type, refund_amount, created_at, order:orders(order_number), customer:customers(name)')
      .eq('store_id', currentStore.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setReturns((data as unknown as ReturnRequest[]) || []);
    setLoading(false);
  }, [currentStore, statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'completed': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <SellerOSLayout>
      <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Customer recovery</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#17191c]">Feedback</h1>
          <p className="mt-2 text-sm text-muted-foreground">Returns, complaints, and reviews in one operating queue.</p>
        </div>

        {/* Pill Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div className="space-y-3">
            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {statusFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] whitespace-nowrap capitalize',
                    statusFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <PageLoading label="Loading feedback" rows={2} />
            ) : returns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <RotateCcw className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No return requests</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statusFilter !== 'all' ? `No ${statusFilter} returns found.` : 'Active return requests will show here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {returns.map(r => (
                  <div
                    key={r.id}
                    className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{r.order?.order_number || 'Unknown'}</p>
                        <Badge className={cn('text-[10px] border-0', statusColor(r.status))}>{r.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.return_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {r.customer?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {r.customer.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {format(new Date(r.created_at), 'dd MMM')}
                        </span>
                        <span className="font-medium text-foreground">{fmt(r.refund_amount)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquareWarning className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No complaints</p>
            <p className="text-xs text-muted-foreground mt-1">Great! Your store has no pending complaints.</p>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Star className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Customer reviews will appear here.</p>
          </div>
        )}
      </div>
    </SellerOSLayout>
  );
}
