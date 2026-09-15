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
  customer_id?: string | null;
  channel?: string | null;
  shipped_at?: string | null;
  order_items?: { product_id: string | null; quantity: number; total_price: number }[];
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
  const buckets = new Map<string, { label: string; fullLabel: string; value: number; orders: number; customerIds: Set<string> }>();
  const cursor = new Date(start);
  while (cursor <= now) {
    const label = unit === 'hour' ? cursor.toLocaleTimeString('en-IN', { hour: 'numeric' }) : cursor.toLocaleDateString('en-IN', unit === 'day' ? { day: 'numeric', month: 'short' } : unit === 'month' ? { month: 'short', year: '2-digit' } : { year: 'numeric' });
    buckets.set(keyFor(cursor), { label, fullLabel: unit === 'hour' ? label : cursor.toLocaleDateString('en-IN', unit === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' } : unit === 'month' ? { month: 'long', year: 'numeric' } : { year: 'numeric' }), value: 0, orders: 0, customerIds: new Set() });
    if (unit === 'hour') cursor.setHours(cursor.getHours() + 1);
    else if (unit === 'day') cursor.setDate(cursor.getDate() + 1);
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  inPeriod.forEach(order => {
    const bucket = buckets.get(keyFor(new Date(order.created_at!)));
    if (bucket) {
      bucket.value += orderValue(order); bucket.orders += 1;
      if (order.customer_id) bucket.customerIds.add(order.customer_id);
    }
  });
  const customers = new Set(inPeriod.map(order => order.customer_id).filter(Boolean)).size;
  return { total, count: inPeriod.length, customers, inPeriod, average: inPeriod.length ? total / inPeriod.length : 0, openOrders, overdue, trend: [...buckets.values()].map(({ customerIds, ...bucket }) => ({ ...bucket, customers: customerIds.size })) };
}

export function getHubOperations(orders: HubOrder[], now = new Date()) {
  const valid = orders.filter(order => isValidOrder(order) && new Date(order.created_at || '') <= now);
  const preDispatch = new Set(['new', 'pending', 'unfulfilled', 'accepted', 'picking', 'packed', 'ready']);
  const recentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const recent = valid.filter(order => new Date(order.created_at || '') >= recentStart);
  const shipped = recent.filter(order => order.shipped_at && new Date(order.shipped_at) <= now);
  const onTime = shipped.filter(order => !order.sla_deadline || new Date(order.shipped_at!) <= new Date(order.sla_deadline));
  const overdue = recent.filter(order => !order.shipped_at && preDispatch.has(order.fulfillment_status || 'new') && order.sla_deadline && new Date(order.sla_deadline) < now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dispatchScore: shipped.length + overdue.length ? Math.round(onTime.length / (shipped.length + overdue.length) * 100) : null,
    failed: valid.filter(order => order.fulfillment_status === 'failed_delivery').length,
    packed: valid.filter(order => ['packed', 'ready'].includes(order.fulfillment_status || '')).length,
    inTransit: valid.filter(order => order.fulfillment_status === 'in_transit').length,
    delivered: valid.filter(order => ['delivered', 'fulfilled'].includes(order.fulfillment_status || '')).length,
    monthValue: valid.filter(order => new Date(order.created_at || '') >= monthStart).reduce((sum, order) => sum + orderValue(order), 0),
  };
}

export function getHubBreakdown(orders: HubOrder[]) {
  const channels = new Map<string, number>();
  const products = new Map<string, { value: number; units: number }>();
  for (const order of orders.filter(isValidOrder)) {
    const channel = order.channel || 'other';
    channels.set(channel, (channels.get(channel) || 0) + orderValue(order));
    for (const item of order.order_items || []) {
      if (!item.product_id) continue;
      const entry = products.get(item.product_id) || { value: 0, units: 0 };
      entry.value += Number(item.total_price) || 0;
      entry.units += Number(item.quantity) || 0;
      products.set(item.product_id, entry);
    }
  }
  const total = [...channels.values()].reduce((sum, value) => sum + value, 0);
  return {
    channels: [...channels].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, value]) => ({ name, value, share: total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0 })),
    products: [...products].sort((a, b) => b[1].value - a[1].value).slice(0, 4).map(([id, entry]) => ({ id, ...entry })),
  };
}
