import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const DAY = 24 * 60 * 60 * 1000;

// Mirrors the seeded settlement economics.
const CHANNEL_FEE_RATES: Record<string, number> = {
  website: 0.02, amazon: 0.08, instagram: 0.08,
};
const SHIPPING_COST_PER_PARCEL = 65;

const EXPENSE_CATEGORIES = ['Marketing', 'Packaging', 'Rent', 'Salaries', 'Software', 'Logistics', 'Other'];

interface OrderRow {
  id: string;
  total: number;
  channel: string | null;
  fulfillment_status: string | null;
  fulfillment_type: string | null;
  shipped_at: string | null;
  created_at: string;
  order_items?: { product_id: string; quantity: number; total_price: number; unit_price: number }[];
}

interface ProductRow { id: string; name: string; price: number; cost_price?: number }
interface ExpenseRow { id: string; category: string; amount: number; note: string | null; incurred_at: string }

type RangeKey = 'month' | '30d';

function unitCost(product: ProductRow | undefined, unitPrice: number): number {
  // Older persisted sandboxes may predate cost_price; estimate at 60% so
  // margins stay plausible instead of showing 100%.
  const cost = Number(product?.cost_price);
  return Number.isFinite(cost) && cost > 0 ? cost : Math.round(unitPrice * 0.6);
}

export function ProfitPanel({ storeId }: { storeId: string }) {
  // Default to a rolling window: calendar month-to-date reads as a loss early
  // in the month (fixed costs land before revenue accrues) and misleads.
  const [range, setRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Map<string, ProductRow>>(new Map());
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Marketing', amount: '', note: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 62 * DAY).toISOString();
    const [ordersRes, productsRes, expensesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, channel, fulfillment_status, fulfillment_type, shipped_at, created_at, order_items(product_id, quantity, total_price, unit_price)')
        .eq('store_id', storeId)
        .gte('created_at', since),
      supabase.from('products').select('id, name, price, cost_price'),
      supabase.from('expenses').select('*').eq('store_id', storeId).order('incurred_at', { ascending: false }),
    ]);
    setOrders((ordersRes.data || []) as OrderRow[]);
    setProducts(new Map(((productsRes.data || []) as ProductRow[]).map((p) => [p.id, p])));
    setExpenses((expensesRes.data || []) as ExpenseRow[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const rangeStart = useMemo(() => {
    const now = new Date();
    return range === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      : now.getTime() - 30 * DAY;
  }, [range]);

  const pnl = useMemo(() => {
    const inRange = orders.filter(
      (o) => new Date(o.created_at).getTime() >= rangeStart && o.fulfillment_status !== 'cancelled'
    );

    let revenue = 0;
    let cogs = 0;
    let channelFees = 0;
    let shipping = 0;
    const byProduct = new Map<string, { name: string; units: number; revenue: number; cogs: number }>();

    for (const order of inRange) {
      const total = Number(order.total || 0);
      revenue += total;
      channelFees += Math.round(total * (CHANNEL_FEE_RATES[order.channel || ''] || 0));
      if (order.fulfillment_type === 'self_ship') shipping += SHIPPING_COST_PER_PARCEL;

      for (const item of order.order_items || []) {
        const product = products.get(item.product_id);
        const cost = unitCost(product, Number(item.unit_price || 0)) * Number(item.quantity || 0);
        cogs += cost;
        const entry = byProduct.get(item.product_id) || {
          name: product?.name || 'Product', units: 0, revenue: 0, cogs: 0,
        };
        entry.units += Number(item.quantity || 0);
        entry.revenue += Number(item.total_price || 0);
        entry.cogs += cost;
        byProduct.set(item.product_id, entry);
      }
    }

    const expensesInRange = expenses.filter((e) => new Date(e.incurred_at).getTime() >= rangeStart);
    const opex = expensesInRange.reduce((s, e) => s + Number(e.amount || 0), 0);
    const opexByCategory = new Map<string, number>();
    for (const e of expensesInRange) {
      opexByCategory.set(e.category, (opexByCategory.get(e.category) || 0) + Number(e.amount || 0));
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - channelFees - shipping - opex;

    const productRows = [...byProduct.values()]
      .map((p) => ({ ...p, profit: p.revenue - p.cogs, margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0 }))
      .sort((a, b) => b.profit - a.profit);

    return {
      orderCount: inRange.length,
      revenue, cogs, grossProfit, channelFees, shipping, opex, netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      opexByCategory: [...opexByCategory.entries()].sort((a, b) => b[1] - a[1]),
      productRows,
    };
  }, [orders, products, expenses, rangeStart]);

  const handleAddExpense = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const { error } = await supabase.from('expenses').insert({
      store_id: storeId,
      category: form.category,
      amount,
      note: form.note || null,
      incurred_at: new Date().toISOString(),
    });
    if (error) { toast.error('Failed to record expense'); return; }
    toast.success('Expense recorded');
    setDialogOpen(false);
    setForm({ category: 'Marketing', amount: '', note: '' });
    fetchAll();
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Computing profit…</p>;
  }

  const positive = pnl.netProfit >= 0;

  const statementRows: { label: string; value: number; kind?: 'minus' | 'subtotal' | 'total' }[] = [
    { label: `Revenue (${pnl.orderCount} orders)`, value: pnl.revenue },
    { label: 'Cost of goods sold', value: -pnl.cogs, kind: 'minus' },
    { label: 'Gross profit', value: pnl.grossProfit, kind: 'subtotal' },
    { label: 'Channel fees', value: -pnl.channelFees, kind: 'minus' },
    { label: 'Shipping cost', value: -pnl.shipping, kind: 'minus' },
    ...pnl.opexByCategory.map(([category, amount]) => ({ label: category, value: -amount, kind: 'minus' as const })),
    { label: 'Net profit', value: pnl.netProfit, kind: 'total' },
  ];

  return (
    <div className="space-y-3">
      {/* Range + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-full border border-border bg-muted/50 p-1">
          {([['30d', 'Last 30 days'], ['month', 'This month']] as [RangeKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                'min-h-[32px] rounded-full px-3 text-xs font-semibold transition-colors',
                range === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add expense
        </Button>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={cn('rounded-2xl border p-4', positive ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {positive ? <TrendingUp className="h-3.5 w-3.5 text-success" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            Net profit
          </div>
          <p className={cn('mt-1.5 text-2xl font-bold tracking-tight', positive ? 'text-success' : 'text-destructive')}>
            {fmt(pnl.netProfit)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Net margin
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{pnl.netMargin.toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Gross margin
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{pnl.grossMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* P&L statement */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Profit &amp; loss</h3>
        <div className="mt-3 space-y-1">
          {statementRows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'flex items-center justify-between py-1.5 text-sm',
                row.kind === 'minus' && 'pl-4 text-muted-foreground',
                row.kind === 'subtotal' && 'border-t border-dashed border-border pt-2 font-semibold',
                row.kind === 'total' && 'border-t border-border pt-2 text-base font-bold',
              )}
            >
              <span>{row.label}</span>
              <span className={cn(
                'tabular-nums',
                row.kind === 'minus' && 'text-muted-foreground',
                row.kind === 'total' && (positive ? 'text-success' : 'text-destructive'),
              )}>
                {row.value < 0 ? `− ${fmt(Math.abs(row.value))}` : fmt(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Product profitability */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Profit by product</h3>
        {pnl.productRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sales in this range yet.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {pnl.productRows.slice(0, 8).map((row) => (
              <div key={row.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <p className="min-w-0 flex-1 truncate font-medium text-foreground">{row.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">{row.units} units · {fmt(row.revenue)}</p>
                  <p className={cn('w-24 shrink-0 text-right font-semibold tabular-nums', row.profit >= 0 ? 'text-success' : 'text-destructive')}>
                    {fmt(row.profit)}
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', row.margin >= 0 ? 'bg-success' : 'bg-destructive')}
                      style={{ width: `${Math.min(100, Math.max(3, Math.abs(row.margin)))}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                    {row.margin.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent expenses */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Recent expenses</h3>
        {expenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No expenses recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {expenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{expense.category}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {format(new Date(expense.incurred_at), 'dd MMM yyyy')}{expense.note ? ` · ${expense.note}` : ''}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-foreground">{fmt(Number(expense.amount))}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add expense dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record an expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                placeholder="2500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Diwali campaign ads"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleAddExpense}>Save expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
