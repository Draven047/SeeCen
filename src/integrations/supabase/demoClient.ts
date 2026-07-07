/* eslint-disable @typescript-eslint/no-explicit-any -- emulates the untyped supabase-js query surface */
// In-browser demo backend: a Supabase-compatible client backed by seeded
// local data. Changes persist to localStorage so a cloned copy behaves like
// a real app; a pristine (never-edited) database is re-seeded after 24h so
// the hosted demo always shows fresh, current-dated data.

import { seedTables, DEMO_USER_ID, DEMO_SEED_VERSION, type DemoRow, type DemoTables } from './demoData';

type Filter = { field: string; op: string; value: any };

const STORAGE_KEY = 'seecen-demo-db';
const PRISTINE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const demoUser = {
  id: DEMO_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@seecen.dev',
  phone: '',
  app_metadata: {},
  user_metadata: { full_name: 'Demo Admin' },
  identities: [],
  created_at: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const demoSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 60 * 60 * 24,
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  token_type: 'bearer',
  user: demoUser,
};

const clone = <T>(value: T): T => (value == null ? value : JSON.parse(JSON.stringify(value)));
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

interface PersistedDb {
  version: number;
  seededAt: string;
  modified: boolean;
  tables: DemoTables;
}

let modified = false;

function loadPersisted(): DemoTables | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const persisted = JSON.parse(raw) as PersistedDb;
    if (persisted.version !== DEMO_SEED_VERSION) return null;
    const age = Date.now() - new Date(persisted.seededAt).getTime();
    // Keep anything the user has touched forever; refresh untouched demos daily
    // so the seeded orders stay current-dated.
    if (!persisted.modified && age > PRISTINE_MAX_AGE_MS) return null;
    modified = persisted.modified;
    seededAt = persisted.seededAt;
    return persisted.tables;
  } catch {
    return null;
  }
}

let seededAt = new Date().toISOString();

function save(tables: DemoTables) {
  try {
    const payload: PersistedDb = { version: DEMO_SEED_VERSION, seededAt, modified, tables };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing / quota exceeded — fall back to in-memory only.
  }
}

let db: DemoTables = (() => {
  const persisted = loadPersisted();
  if (persisted) return persisted;
  seededAt = new Date().toISOString();
  modified = false;
  const fresh = seedTables();
  save(fresh);
  return fresh;
})();

function markModified() {
  modified = true;
  save(db);
}

export function resetDemoDatabase() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  seededAt = new Date().toISOString();
  modified = false;
  db = seedTables();
  save(db);
}

export function exportDemoDatabase(): string {
  return JSON.stringify(
    { app: 'seecen', version: DEMO_SEED_VERSION, exportedAt: new Date().toISOString(), seededAt, tables: db },
    null,
    2
  );
}

export function importDemoDatabase(json: string): { ok: boolean; error?: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Could not parse the file — is it a SeeCen backup?' };
  }
  if (!parsed || typeof parsed !== 'object' || parsed.app !== 'seecen' || typeof parsed.tables !== 'object') {
    return { ok: false, error: 'This file is not a SeeCen backup.' };
  }
  if (!Array.isArray(parsed.tables.orders) || !Array.isArray(parsed.tables.stores)) {
    return { ok: false, error: 'The backup is missing core tables.' };
  }
  db = parsed.tables as DemoTables;
  seededAt = parsed.seededAt || new Date().toISOString();
  // Imported data is user data — never auto-reseed over it.
  modified = true;
  save(db);
  return { ok: true };
}

function buildAiContext() {
  const orders = db.orders || [];
  const customers = db.customers || [];
  const target = (db.sales_targets || [])[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = orders.filter((o) => new Date(o.created_at) >= monthStart && o.fulfillment_status !== 'cancelled');
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const revenueThisMonth = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const daysLeft = Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate());
  const targetAmount = Number(target?.target_amount || 250000);
  const remaining = Math.max(0, targetAmount - revenueThisMonth);
  return {
    salespersonName: 'Demo Admin',
    totalCustomers: customers.length,
    customersNeedingFollowUp: orders.filter((order) => ['new', 'accepted'].includes(order.fulfillment_status)).length,
    upcomingBirthdaysCount: customers.filter((customer) => String(customer.date_of_birth || '').slice(5, 7) === currentMonth).length,
    highValueCustomersCount: customers.filter((customer) => Number(customer.fume_points_balance || 0) > 400).length,
    totalOrders: orders.length,
    ordersThisMonth: monthOrders.length,
    totalRevenue,
    revenueThisMonth,
    avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
    targetAmount,
    achievedAmount: revenueThisMonth,
    targetProgress: targetAmount ? ((revenueThisMonth / targetAmount) * 100).toFixed(1) : '0',
    remainingToTarget: remaining,
    daysLeftInQuarter: daysLeft,
    dailyTargetNeeded: Math.round(remaining / daysLeft),
  };
}

const relationMap: Record<string, string> = {
  customers: 'customers',
  customer: 'customers',
  stores: 'stores',
  store: 'stores',
  orders: 'orders',
  order: 'orders',
  order_items: 'order_items',
  items: 'order_items',
  cigars: 'cigars',
  cigar: 'cigars',
  products: 'products',
  product: 'products',
  product_variants: 'product_variants',
  variant: 'product_variants',
  profiles: 'profiles',
  profile: 'profiles',
};

function pick(row: DemoRow | null | undefined, spec?: string) {
  if (!row) return row;
  if (!spec || spec.includes('*')) return clone(row);
  const keys = spec.split(',').map((part) => part.trim().split(':')[0]).filter(Boolean);
  return Object.fromEntries(keys.map((key) => [key, clone(row[key])]));
}

function attachRelation(table: string, row: DemoRow, alias: string, target: string, spec?: string) {
  const tableName = relationMap[target] || target;
  if (tableName === 'customers') {
    const customerId = row.customer_id || (table === 'orders' ? row.customer_id : null);
    row[alias] = pick(db.customers.find((item) => item.id === customerId), spec) || null;
  } else if (tableName === 'stores') {
    row[alias] = pick(db.stores.find((item) => item.id === row.store_id), spec) || null;
  } else if (tableName === 'orders') {
    row[alias] = pick(db.orders.find((item) => item.id === row.order_id || item.id === row.original_order_id), spec) || null;
    if (row[alias]?.customer_id) row[alias].customer = pick(db.customers.find((item) => item.id === row[alias].customer_id));
  } else if (tableName === 'order_items') {
    const items = db.order_items.filter((item) => item.order_id === row.id || item.return_request_id === row.id).map((item) => enrich('order_items', item, spec));
    row[alias] = items;
  } else if (tableName === 'cigars') {
    row[alias] = pick(db.cigars.find((item) => item.id === row.cigar_id || item.id === row.product_id), spec) || null;
  } else if (tableName === 'products') {
    row[alias] = pick(db.products.find((item) => item.id === row.product_id || item.id === row.cigar_id), spec) || null;
  } else if (tableName === 'product_variants') {
    row[alias] = pick(db.product_variants.find((item) => item.id === row.variant_id), spec) || null;
  } else if (tableName === 'profiles') {
    row[alias] = pick(db.profiles.find((item) => item.id === row.user_id || item.id === row.created_by), spec) || null;
  }
}

function enrich(table: string, source: DemoRow, selectSpec?: string) {
  const row = clone(source);
  const relationPattern = /(\w+)(?::(\w+))?\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = relationPattern.exec(selectSpec || '')) !== null) {
    const [, first, second, spec] = match;
    const alias = second ? first : first;
    const target = second || first;
    attachRelation(table, row, alias, target, spec);
  }
  if (table === 'orders') {
    row.customer ??= pick(db.customers.find((item) => item.id === row.customer_id));
    row.customers ??= row.customer;
    row.store ??= pick(db.stores.find((item) => item.id === row.store_id));
    row.stores ??= row.store;
    row.items ??= db.order_items.filter((item) => item.order_id === row.id).map((item) => enrich('order_items', item));
    row.order_items ??= row.items;
  }
  if (table === 'store_assignments') row.store ??= pick(db.stores.find((item) => item.id === row.store_id));
  if (table === 'return_requests') {
    row.order ??= pick(db.orders.find((item) => item.id === row.order_id));
    row.customer ??= pick(db.customers.find((item) => item.id === row.customer_id));
    row.items ??= db.return_request_items.filter((item) => item.return_request_id === row.id);
  }
  if (table === 'shipments') {
    row.order ??= pick(db.orders.find((item) => item.id === row.order_id));
    if (row.order?.customer_id) row.order.customer = pick(db.customers.find((item) => item.id === row.order.customer_id));
  }
  return row;
}

function compare(value: any, op: string, expected: any) {
  if (op === 'eq') return value === expected;
  if (op === 'neq') return value !== expected;
  if (op === 'in') return Array.isArray(expected) && expected.includes(value);
  if (op === 'gt') return value > expected;
  if (op === 'lt') return value < expected;
  if (op === 'gte') return value >= expected;
  if (op === 'lte') return value <= expected;
  if (op === 'is') return expected === null ? value == null : value === expected;
  if (op === 'not.is') return expected === null ? value != null : value !== expected;
  if (op === 'ilike') return String(value || '').toLowerCase().includes(String(expected).replace(/%/g, '').toLowerCase());
  return true;
}

class DemoQueryBuilder implements PromiseLike<any> {
  private filters: Filter[] = [];
  private orGroups: Filter[][] = [];
  private selectSpec = '*';
  private selectOptions: any = {};
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any;
  private orderBy: { field: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private wantsSingle = false;
  private wantsMaybeSingle = false;

  constructor(private table: string) {}

  select(columns = '*', options?: any) { this.selectSpec = columns; this.selectOptions = options || {}; return this; }
  eq(field: string, value: any) { this.filters.push({ field, op: 'eq', value }); return this; }
  neq(field: string, value: any) { this.filters.push({ field, op: 'neq', value }); return this; }
  in(field: string, value: any[]) { this.filters.push({ field, op: 'in', value }); return this; }
  gte(field: string, value: any) { this.filters.push({ field, op: 'gte', value }); return this; }
  lte(field: string, value: any) { this.filters.push({ field, op: 'lte', value }); return this; }
  gt(field: string, value: any) { this.filters.push({ field, op: 'gt', value }); return this; }
  lt(field: string, value: any) { this.filters.push({ field, op: 'lt', value }); return this; }
  ilike(field: string, value: any) { this.filters.push({ field, op: 'ilike', value }); return this; }
  not(field: string, op: string, value: any) { this.filters.push({ field, op: `not.${op}`, value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.orderBy = { field, ascending: options?.ascending !== false }; return this; }
  limit(count: number) { this.limitCount = count; return this; }
  single() { this.wantsSingle = true; return this; }
  maybeSingle() { this.wantsMaybeSingle = true; return this; }
  insert(payload: any) { this.action = 'insert'; this.payload = payload; return this; }
  update(payload: any) { this.action = 'update'; this.payload = payload; return this; }
  delete() { this.action = 'delete'; return this; }
  upsert(payload: any) { this.action = 'upsert'; this.payload = payload; return this; }
  or(expression: string) {
    const filters = expression.split(',').map((part) => {
      const [field, op, ...rest] = part.split('.');
      const raw = rest.join('.');
      return { field, op, value: op === 'is' && raw === 'null' ? null : raw };
    });
    this.orGroups.push(filters);
    return this;
  }

  then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private ensureTable() {
    db[this.table] ??= [];
    return db[this.table];
  }

  private matches(row: DemoRow) {
    const direct = this.filters.every((filter) => compare(row[filter.field], filter.op, filter.value));
    const grouped = this.orGroups.every((group) => group.some((filter) => compare(row[filter.field], filter.op, filter.value)));
    return direct && grouped;
  }

  private selected(rows: DemoRow[]) {
    let next = rows.map((row) => enrich(this.table, row, this.selectSpec));
    if (this.orderBy) {
      const { field, ascending } = this.orderBy;
      next = next.sort((a, b) => {
        const av = a[field] ?? '';
        const bv = b[field] ?? '';
        return (av > bv ? 1 : av < bv ? -1 : 0) * (ascending ? 1 : -1);
      });
    }
    if (this.limitCount != null) next = next.slice(0, this.limitCount);
    return next;
  }

  private async execute() {
    const table = this.ensureTable();
    let rows: DemoRow[] = [];
    let affected: DemoRow[] = [];

    if (this.action === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      affected = items.map((item) => ({ id: item.id || makeId(this.table), created_at: item.created_at || new Date().toISOString(), updated_at: item.updated_at || new Date().toISOString(), ...clone(item) }));
      table.push(...affected);
      rows = affected;
      markModified();
    } else if (this.action === 'update') {
      affected = table.filter((row) => this.matches(row));
      affected.forEach((row) => Object.assign(row, clone(this.payload), { updated_at: new Date().toISOString() }));
      rows = affected;
      markModified();
    } else if (this.action === 'delete') {
      affected = table.filter((row) => this.matches(row));
      db[this.table] = table.filter((row) => !this.matches(row));
      rows = affected;
      markModified();
    } else if (this.action === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      affected = items.map((item) => {
        const existing = item.id ? table.find((row) => row.id === item.id) : null;
        if (existing) {
          Object.assign(existing, clone(item), { updated_at: new Date().toISOString() });
          return existing;
        }
        const inserted = { id: item.id || makeId(this.table), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...clone(item) };
        table.push(inserted);
        return inserted;
      });
      rows = affected;
      markModified();
    } else {
      rows = table.filter((row) => this.matches(row));
    }

    const dataRows = this.selected(rows);
    const count = rows.length;
    let data: any = this.selectOptions.head ? null : dataRows;
    if (this.wantsSingle || this.wantsMaybeSingle) data = dataRows[0] || null;
    if (this.wantsSingle && !data) return { data: null, count, error: { message: 'No rows found', code: 'PGRST116' } };
    return { data, count, error: null };
  }
}

function localAiRecommendation() {
  const context = buildAiContext();
  const lowStock = db.store_inventory
    .filter((item) => Number(item.quantity) <= Number(item.min_stock_level || 0))
    .map((item) => db.products.find((product) => product.id === item.product_id)?.name)
    .filter(Boolean) as string[];
  const openOrders = db.orders.filter((o) => !['delivered', 'cancelled'].includes(o.fulfillment_status)).length;
  const recommendations = {
    dailySummary: `You have ${openOrders} open orders, ${context.customersNeedingFollowUp} follow-ups, and ${lowStock.length} stock priorities. Start with overdue orders and low-stock winners.`,
    cigarsToSell: [
      { cigarName: lowStock[0] || 'Oxford Cotton Shirt', reason: 'Low stock plus strong attach rate.', suggestedCustomers: ['Aanya Sharma', 'Rohan Kapoor'], pitchLine: 'This is moving fast today, and it pairs well with recent purchases.', urgency: 'High' },
    ],
    followUpCustomers: [
      { customerName: 'Rohan Kapoor', phone: '+91 90000 10002', reason: 'COD order still needs packing confirmation.', lastOrderDaysAgo: 2, suggestedProducts: ['Everyday Court Sneaker'], messageTemplate: 'Hi Rohan, your order is ready to move. Can we confirm delivery timing?', priority: 'High' },
    ],
    crossSellOpportunities: [
      { customerName: 'Aanya Sharma', currentPreference: 'Workwear', suggestedProduct: 'Weekend Canvas Tote', pitchReason: 'Adds utility to blazer and shirt purchases.', discount: '10%' },
    ],
    offerRecommendations: [
      { offerType: 'Bundle', targetCustomers: 'Recent workwear buyers', description: 'Blazer + shirt + tote set', validReason: 'Higher basket value with practical pairing.' },
    ],
    incentiveCoaching: {
      currentProgress: `${context.targetProgress}%`,
      remainingAmount: `Rs ${context.remainingToTarget.toLocaleString('en-IN')}`,
      daysLeft: context.daysLeftInQuarter,
      dailyNeeded: `Rs ${context.dailyTargetNeeded.toLocaleString('en-IN')}`,
      motivationalTip: 'Close two follow-ups before noon and one cross-sell after lunch.',
      nextMilestone: `Rs ${Math.round(context.targetAmount / 1000)}K monthly GMV`,
    },
    stockPriorities: lowStock.map((name) => ({ cigarName: name, currentStock: 3, action: 'Replenish this week', reason: 'Below demo safety stock.' })),
    weeklyGoals: [
      { goal: 'Pack all accepted orders', metric: '0 accepted orders older than 24h', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
      { goal: 'Replenish low-stock SKUs', metric: 'Low stock count below 2', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    ],
  };

  const today = new Date().toISOString().slice(0, 10);
  const existing = db.ai_coach_daily_recommendations.find((item) => item.user_id === demoUser.id && item.recommendation_date === today);
  const row = {
    id: existing?.id || makeId('ai'),
    user_id: demoUser.id,
    recommendation_date: today,
    daily_summary: recommendations.dailySummary,
    cigars_to_push: recommendations.cigarsToSell,
    follow_up_customers: recommendations.followUpCustomers,
    cross_sell_opportunities: recommendations.crossSellOpportunities,
    offer_recommendations: recommendations.offerRecommendations,
    incentive_coaching: recommendations.incentiveCoaching,
    stock_priorities: recommendations.stockPriorities,
    analysis_context: context,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else db.ai_coach_daily_recommendations.unshift(row);
  return { recommendations, context };
}

export const demoSupabase = {
  auth: {
    onAuthStateChange(callback: (event: string, session: any) => void) {
      queueMicrotask(() => callback('SIGNED_IN', demoSession));
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() { return { data: { session: demoSession }, error: null }; },
    async signInWithPassword() { return { data: { user: demoUser, session: demoSession }, error: null }; },
    async signUp() { return { data: { user: demoUser, session: demoSession }, error: null }; },
    async signOut() { return { error: null }; },
    async getClaims() { return { data: { claims: { sub: demoUser.id, role: 'authenticated' } }, error: null }; },
  },
  from(table: string) {
    return new DemoQueryBuilder(table);
  },
  async rpc(name: string) {
    if (name === 'generate_invoice_number') return { data: `SC-DEMO-${String(db.orders.filter((order) => order.invoice_number).length + 1).padStart(4, '0')}`, error: null };
    if (name === 'generate_credit_note_number') return { data: `CN-DEMO-${String(db.credit_notes.length + 1).padStart(4, '0')}`, error: null };
    return { data: null, error: null };
  },
  functions: {
    async invoke(name: string, options?: any) {
      if (name === 'ai-coach-generate') return { data: localAiRecommendation(), error: null };
      if (name === 'ai-coach-chat') {
        const message = String(options?.body?.message || '').toLowerCase();
        const context = buildAiContext();
        const response = message.includes('target')
          ? `You are at ${context.targetProgress}% of the demo target. Close about ${context.dailyTargetNeeded.toLocaleString('en-IN')} INR per day to hit it.`
          : message.includes('follow')
            ? 'Follow up with Rohan Kapoor first, then Aanya Sharma for the tote cross-sell. Both are seeded demo customers.'
            : 'Today, prioritize overdue orders, low-stock Oxford shirts, and one workwear bundle pitch. This coach is local and deterministic for the open-source demo.';
        return { data: { response }, error: null };
      }
      if (name === 'sales-coach') return { data: { summary: localAiRecommendation().recommendations.dailySummary, recommendations: localAiRecommendation().recommendations }, error: null };
      return { data: {}, error: null };
    },
  },
  channel(name: string) {
    return {
      name,
      on() { return this; },
      subscribe(callback?: (status: string) => void) {
        queueMicrotask(() => callback?.('SUBSCRIBED'));
        return this;
      },
    };
  },
  removeChannel() {
    return 'ok';
  },
};
