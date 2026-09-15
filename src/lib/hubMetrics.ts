export interface HubOrder {
  id: string;
  order_number: string | null;
  total: number | string | null;
  status: string | null;
  fulfillment_status: string | null;
  is_voided: boolean | null;
  created_at: string | null;
  sla_deadline: string | null;
  customer: { name: string | null } | { name: string | null }[] | null;
}

export type HubPeriod = 'today' | '7d' | '30d' | 'all';
const openStatuses = new Set(['new', 'pending', 'unfulfilled', 'accepted', 'picking', 'packed', 'ready', 'pickup_scheduled', 'handover', 'in_transit', 'partial_fulfilled', 'partially_fulfilled']);

export function isValidOrder(order: HubOrder) {
  return !order.is_voided && !['cancelled', 'declined', 'voided'].includes(order.status || '') && !['cancelled', 'declined'].includes(order.fulfillment_status || '');
}

export function isOpenOrder(order: HubOrder) {
  return isValidOrder(order) && openStatuses.has(order.fulfillment_status || 'new');
}

export function orderValue(order: HubOrder) {
  const value = Number(order.total || 0);
  return Number.isFinite(value) ? value : 0;
}

function localDay(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getHubMetrics(orders: HubOrder[], period: HubPeriod, now = new Date()) {
  // Use local calendar boundaries, matching the date shown to the seller.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === '30d') start.setDate(start.getDate() - 29);
  const valid = orders.filter(order => {
    const created = new Date(order.created_at || '').getTime();
    return isValidOrder(order) && Number.isFinite(created) && created <= now.getTime();
  });
  const inPeriod = valid.filter(order => period === 'all' || new Date(order.created_at!) >= start);
  const total = inPeriod.reduce((sum, order) => sum + orderValue(order), 0);
  const openOrders = orders.filter(isOpenOrder);
  const overdue = openOrders.filter(order => order.sla_deadline && new Date(order.sla_deadline) < now);
  let unit: 'hour' | 'day' | 'month' | 'year' = period === 'today' ? 'hour' : 'day';
  if (period === 'all') {
    const first = valid.reduce((date, order) => new Date(order.created_at!) < date ? new Date(order.created_at!) : date, now);
    start.setFullYear(first.getFullYear(), first.getMonth(), 1);
    const months = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth();
    unit = months > 11 ? 'year' : 'month';
    if (unit === 'year') start.setMonth(0);
  }
  const keyFor = (date: Date) => unit === 'hour' ? `${localDay(date)}-${date.getHours()}` : unit === 'day' ? localDay(date) : unit === 'month' ? `${date.getFullYear()}-${date.getMonth()}` : `${date.getFullYear()}`;
  const buckets = new Map<string, { label: string; fullLabel: string; value: number; orders: number }>();
  const cursor = new Date(start);
  while (cursor <= now) {
    const label = unit === 'hour' ? cursor.toLocaleTimeString('en-IN', { hour: 'numeric' }) : cursor.toLocaleDateString('en-IN', unit === 'day' ? { day: 'numeric', month: 'short' } : unit === 'month' ? { month: 'short', year: '2-digit' } : { year: 'numeric' });
    buckets.set(keyFor(cursor), { label, fullLabel: unit === 'hour' ? label : cursor.toLocaleDateString('en-IN', unit === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' } : unit === 'month' ? { month: 'long', year: 'numeric' } : { year: 'numeric' }), value: 0, orders: 0 });
    if (unit === 'hour') cursor.setHours(cursor.getHours() + 1);
    else if (unit === 'day') cursor.setDate(cursor.getDate() + 1);
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  inPeriod.forEach(order => {
    const bucket = buckets.get(keyFor(new Date(order.created_at!)));
    if (bucket) { bucket.value += orderValue(order); bucket.orders += 1; }
  });
  return { total, count: inPeriod.length, average: inPeriod.length ? total / inPeriod.length : 0, openOrders, overdue, trend: [...buckets.values()] };
}
