/* eslint-disable @typescript-eslint/no-explicit-any -- rows mirror the untyped demo backend */
// Deterministic demo dataset generator.
// Dates are generated relative to the real current time so the app always
// looks alive (today's orders exist today), while the random sequence is
// seeded so every visitor gets the same believable store.

export type DemoRow = Record<string, any>;
export type DemoTables = Record<string, DemoRow[]>;

export const DEMO_USER_ID = 'demo-admin';
export const DEMO_SEED_VERSION = 4;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// mulberry32 — small deterministic PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedTables(): DemoTables {
  const rand = mulberry32(20260616);
  const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pickOne = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const weighted = <T>(entries: [T, number][]): T => {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = rand() * total;
    for (const [value, w] of entries) { roll -= w; if (roll <= 0) return value; }
    return entries[entries.length - 1][0];
  };

  const now = new Date();
  const iso = (daysAgo = 0, hoursOffset = 0) =>
    new Date(now.getTime() - daysAgo * DAY + hoursOffset * HOUR).toISOString();
  const dateOnly = (daysAgo = 0) => iso(daysAgo).slice(0, 10);
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const stores = [
    { id: 'store_mumbai', name: 'SeeCen Mumbai', address: 'Bandra West, Mumbai', phone: '+91 98765 00011', created_at: iso(180) },
    { id: 'store_delhi', name: 'SeeCen Delhi', address: 'Hauz Khas, New Delhi', phone: '+91 98765 00012', created_at: iso(170) },
  ];

  const profiles = [
    { id: DEMO_USER_ID, email: 'demo@seecen.dev', full_name: 'Demo Admin', created_at: iso(160), updated_at: iso(1) },
    { id: 'sales-001', email: 'maya@seecen.dev', full_name: 'Maya Rao', created_at: iso(150), updated_at: iso(2) },
    { id: 'ops-001', email: 'arjun@seecen.dev', full_name: 'Arjun Mehta', created_at: iso(140), updated_at: iso(2) },
  ];

  const user_roles = [
    { id: 'role_demo', user_id: DEMO_USER_ID, role: 'admin', is_approved: true, created_at: iso(160) },
    { id: 'role_sales', user_id: 'sales-001', role: 'sales', is_approved: true, created_at: iso(150) },
    { id: 'role_pending', user_id: 'pending-001', role: 'sales', is_approved: false, created_at: iso(3) },
  ];

  const store_assignments = [
    { id: 'assign_demo_mumbai', user_id: DEMO_USER_ID, store_id: 'store_mumbai', created_at: iso(160) },
    { id: 'assign_demo_delhi', user_id: DEMO_USER_ID, store_id: 'store_delhi', created_at: iso(160) },
    { id: 'assign_sales_mumbai', user_id: 'sales-001', store_id: 'store_mumbai', created_at: iso(150) },
  ];

  const img = (photoId: string) => `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`;
  const products = [
    { id: 'prod_linen_blazer', name: 'Linen Utility Blazer', brand: 'Northstar', category: 'Outerwear', description: 'Breathable structured blazer for city commutes.', base_price: 4290, mrp: 4990, price: 4290, sku: 'NS-BLZ-LIN', image_urls: [img('photo-1591047139829-d91aecb6caea')], is_active: true, created_at: iso(140), updated_at: iso(1) },
    { id: 'prod_cotton_shirt', name: 'Oxford Cotton Shirt', brand: 'CenWear', category: 'Tops & Shirts', description: 'Crisp everyday button down.', base_price: 1890, mrp: 2290, price: 1890, sku: 'CW-OXF-WHT', image_urls: [img('photo-1602810318383-e386cc2a3ccf')], is_active: true, created_at: iso(135), updated_at: iso(1) },
    { id: 'prod_weekend_tote', name: 'Weekend Canvas Tote', brand: 'CenCarry', category: 'Accessories', description: 'Heavy canvas tote with laptop sleeve.', base_price: 1590, mrp: 1990, price: 1590, sku: 'CC-TOTE-CRM', image_urls: [img('photo-1590874103328-eac38a683ce7')], is_active: true, created_at: iso(130), updated_at: iso(1) },
    { id: 'prod_wrap_dress', name: 'Soft Wrap Dress', brand: 'Mira', category: 'Dresses', description: 'Drape-friendly wrap dress in modal blend.', base_price: 2790, mrp: 3290, price: 2790, sku: 'MR-WRAP-BLK', image_urls: [img('photo-1595777457583-95e059d581b8')], is_active: true, created_at: iso(128), updated_at: iso(1) },
    { id: 'prod_sneaker', name: 'Everyday Court Sneaker', brand: 'Stride', category: 'Footwear', description: 'Minimal low-top sneaker with cushioned sole.', base_price: 3490, mrp: 3990, price: 3490, sku: 'ST-CRT-WHT', image_urls: [img('photo-1549298916-b41d501d3772')], is_active: true, created_at: iso(120), updated_at: iso(1) },
    { id: 'prod_denim_jacket', name: 'Washed Denim Jacket', brand: 'Northstar', category: 'Outerwear', description: 'Mid-wash trucker jacket with brushed lining.', base_price: 3190, mrp: 3690, price: 3190, sku: 'NS-DNM-JKT', image_urls: [img('photo-1576995853123-5a10305d93c0')], is_active: true, created_at: iso(110), updated_at: iso(2) },
    { id: 'prod_chino', name: 'Tapered Chino Trousers', brand: 'CenWear', category: 'Bottoms', description: 'Stretch cotton chinos with a clean taper.', base_price: 2190, mrp: 2590, price: 2190, sku: 'CW-CHN-KHK', image_urls: [img('photo-1473966968600-fa801b869a1a')], is_active: true, created_at: iso(100), updated_at: iso(2) },
    { id: 'prod_scarf', name: 'Silk Print Scarf', brand: 'Mira', category: 'Accessories', description: 'Hand-finished silk twill scarf.', base_price: 1290, mrp: 1590, price: 1290, sku: 'MR-SCF-PRT', image_urls: [img('photo-1601924994987-69e26d50dc26')], is_active: true, created_at: iso(90), updated_at: iso(3) },
    { id: 'prod_sweater', name: 'Merino Knit Sweater', brand: 'Northstar', category: 'Tops & Shirts', description: 'Fine-gauge merino crewneck.', base_price: 2990, mrp: 3490, price: 2990, sku: 'NS-KNT-NVY', image_urls: [img('photo-1576871337622-98d48d1cf531')], is_active: true, created_at: iso(80), updated_at: iso(3) },
    { id: 'prod_skirt', name: 'Pleated Midi Skirt', brand: 'Mira', category: 'Dresses', description: 'Sharp-pleat midi with elastic comfort band.', base_price: 2390, mrp: 2790, price: 2390, sku: 'MR-SKT-PLT', image_urls: [img('photo-1583496661160-fb5886a13d44')], is_active: true, created_at: iso(70), updated_at: iso(4) },
    { id: 'prod_crossbody', name: 'City Crossbody Bag', brand: 'CenCarry', category: 'Accessories', description: 'Compact water-resistant crossbody.', base_price: 2090, mrp: 2490, price: 2090, sku: 'CC-XBD-BLK', image_urls: [img('photo-1548036328-c9fa89d128fa')], is_active: true, created_at: iso(60), updated_at: iso(4) },
    { id: 'prod_loafer', name: 'Suede Penny Loafer', brand: 'Stride', category: 'Footwear', description: 'Soft suede loafer with stacked heel.', base_price: 3990, mrp: 4590, price: 3990, sku: 'ST-LFR-TAN', image_urls: [img('photo-1614252369475-531eba835eb1')], is_active: true, created_at: iso(50), updated_at: iso(5) },
  ];

  // Landed unit cost per product — drives the true-P&L and profitability views.
  const costRatios: Record<string, number> = {
    prod_linen_blazer: 0.5, prod_cotton_shirt: 0.48, prod_weekend_tote: 0.55,
    prod_wrap_dress: 0.52, prod_sneaker: 0.62, prod_denim_jacket: 0.56,
    prod_chino: 0.54, prod_scarf: 0.42, prod_sweater: 0.58,
    prod_skirt: 0.5, prod_crossbody: 0.57, prod_loafer: 0.6,
  };
  products.forEach((p) => {
    (p as DemoRow).cost_price = Math.round(p.base_price * (costRatios[p.id] ?? 0.55));
  });

  const cigars = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.base_price, category: p.category, image_url: p.image_urls[0], is_active: p.is_active, created_at: p.created_at }));

  const product_variants = [
    { id: 'var_blazer_s', product_id: 'prod_linen_blazer', color: 'Sage', size: 'S', sku: 'NS-BLZ-SGE-S', price_adjustment: 0, is_active: true },
    { id: 'var_blazer_m', product_id: 'prod_linen_blazer', color: 'Sage', size: 'M', sku: 'NS-BLZ-SGE-M', price_adjustment: 0, is_active: true },
    { id: 'var_shirt_m', product_id: 'prod_cotton_shirt', color: 'White', size: 'M', sku: 'CW-OXF-WHT-M', price_adjustment: 0, is_active: true },
    { id: 'var_shirt_l', product_id: 'prod_cotton_shirt', color: 'White', size: 'L', sku: 'CW-OXF-WHT-L', price_adjustment: 0, is_active: true },
    { id: 'var_dress_m', product_id: 'prod_wrap_dress', color: 'Black', size: 'M', sku: 'MR-WRAP-BLK-M', price_adjustment: 0, is_active: true },
    { id: 'var_sneaker_42', product_id: 'prod_sneaker', color: 'White', size: '42', sku: 'ST-CRT-WHT-42', price_adjustment: 0, is_active: true },
    { id: 'var_jacket_m', product_id: 'prod_denim_jacket', color: 'Mid Wash', size: 'M', sku: 'NS-DNM-JKT-M', price_adjustment: 0, is_active: true },
    { id: 'var_loafer_43', product_id: 'prod_loafer', color: 'Tan', size: '43', sku: 'ST-LFR-TAN-43', price_adjustment: 0, is_active: true },
  ];

  const customerSpecs: [string, string, string, string | null][] = [
    ['Aanya Sharma', 'aanya@example.com', 'Andheri West, Mumbai', `1994-${currentMonth}-22`],
    ['Rohan Kapoor', 'rohan@example.com', 'Powai, Mumbai', '1989-07-04'],
    ['Nisha Iyer', 'nisha@example.com', 'GK II, Delhi', `1991-${currentMonth}-18`],
    ['Karan Malhotra', 'karan@example.com', 'Saket, Delhi', null],
    ['Priya Desai', 'priya@example.com', 'Juhu, Mumbai', '1996-01-30'],
    ['Vikram Singh', 'vikram@example.com', 'Vasant Kunj, Delhi', '1987-11-12'],
    ['Sara Fernandes', 'sara@example.com', 'Bandra East, Mumbai', '1993-03-08'],
    ['Aditya Nair', 'aditya@example.com', 'Dwarka, Delhi', null],
    ['Meera Joshi', 'meera@example.com', 'Dadar, Mumbai', '1990-09-25'],
    ['Farhan Sheikh', 'farhan@example.com', 'Lajpat Nagar, Delhi', '1992-05-17'],
    ['Ishita Bansal', 'ishita@example.com', 'Malad West, Mumbai', null],
    ['Dev Patel', 'dev@example.com', 'Rohini, Delhi', '1985-12-02'],
    ['Tanvi Kulkarni', 'tanvi@example.com', 'Thane West, Mumbai', '1997-08-19'],
    ['Arnav Chopra', 'arnav@example.com', 'Noida Sector 18', null],
    ['Lakshmi Menon', 'lakshmi@example.com', 'Chembur, Mumbai', '1988-04-11'],
    ['Zoya Khan', 'zoya@example.com', 'Hauz Khas, Delhi', '1995-10-07'],
  ];

  const customers = customerSpecs.map(([name, email, address, dob], i) => ({
    id: `cust_${String(i + 1).padStart(3, '0')}`,
    name, email, address,
    phone: `+91 90000 1${String(i + 1).padStart(4, '0')}`,
    date_of_birth: dob,
    is_blacklisted: false,
    fume_points_balance: 0, // accumulated from generated orders below
    created_by: i % 3 === 0 ? 'sales-001' : DEMO_USER_ID,
    // a few recent signups so "new customers" analytics have data
    created_at: iso(i < 12 ? randInt(30, 150) : randInt(2, 25)),
    updated_at: iso(randInt(0, 10)),
  }));

  // ---- Order generation: ~90 days of history --------------------------------
  const channels: [string, number][] = [
    ['website', 34], ['in_store', 18], ['amazon', 17], ['instagram', 14], ['walk_in', 9], ['ondc', 8],
  ];
  // first few customers are "regulars" and order more often
  const customerWeights: [string, number][] = customers.map((c, i) => [c.id, i < 5 ? 3 : 1]);

  const orders: DemoRow[] = [];
  const order_items: DemoRow[] = [];
  const fume_points_ledger: DemoRow[] = [];
  let orderSeq = 1000;
  let invoiceSeq = 1;
  let itemSeq = 1;

  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const makeOrder = (createdAtMs: number, daysAgo: number, forceStatus?: string, forceSlaBreached?: boolean) => {
    orderSeq += 1;
    const id = `order_${orderSeq}`;
    const createdAt = new Date(createdAtMs).toISOString();
    const storeId = rand() < 0.55 ? 'store_mumbai' : 'store_delhi';
    // Only customers who already existed at order time can buy — keeps
    // new-vs-returning analytics honest.
    let customerId = weighted(customerWeights);
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = customers.find((c) => c.id === customerId);
      if (candidate && new Date(candidate.created_at).getTime() <= createdAtMs) break;
      customerId = weighted(customerWeights);
    }
    const channel = weighted(channels);
    const paymentType = rand() < 0.3 ? 'cod' : 'prepaid';

    // pick 1-3 distinct products
    const lineCount = weighted<number>([[1, 55], [2, 32], [3, 13]]);
    const chosen: typeof products[number][] = [];
    while (chosen.length < lineCount) {
      const p = pickOne(products);
      if (!chosen.includes(p)) chosen.push(p);
    }
    let subtotal = 0;
    const items = chosen.map((p) => {
      const quantity = rand() < 0.8 ? 1 : 2;
      const total = p.price * quantity;
      subtotal += total;
      const variant = product_variants.find((v) => v.product_id === p.id);
      return {
        id: `oi_${itemSeq++}`,
        order_id: id,
        product_id: p.id,
        cigar_id: p.id,
        variant_id: variant?.id || null,
        quantity,
        unit_price: p.price,
        total_price: total,
      };
    });

    // fulfillment by age — statuses follow the Orders queue workflow:
    // new -> accepted -> packed -> in_transit -> delivered (or cancelled)
    let fulfillment: string;
    if (forceStatus) {
      fulfillment = forceStatus;
    } else if (daysAgo >= 10) {
      fulfillment = weighted([['delivered', 94], ['cancelled', 6]]);
    } else if (daysAgo >= 4) {
      fulfillment = weighted([['delivered', 70], ['in_transit', 15], ['packed', 8], ['cancelled', 7]]);
    } else if (daysAgo >= 1) {
      fulfillment = weighted([['delivered', 30], ['in_transit', 30], ['packed', 20], ['accepted', 15], ['cancelled', 5]]);
    } else {
      fulfillment = weighted([['new', 30], ['accepted', 30], ['packed', 25], ['delivered', 15]]);
    }

    const cancelled = fulfillment === 'cancelled';
    const delivered = fulfillment === 'delivered';
    const reachedAccepted = ['accepted', 'packed', 'in_transit', 'delivered'].includes(fulfillment);
    const reachedPacked = ['packed', 'in_transit', 'delivered'].includes(fulfillment);
    const reachedShipped = ['in_transit', 'delivered'].includes(fulfillment);

    const acceptedAt = reachedAccepted ? createdAtMs + randInt(1, 4) * HOUR : null;
    const packedAt = reachedPacked && acceptedAt ? acceptedAt + randInt(2, 12) * HOUR : null;
    const shippedAt = reachedShipped && packedAt ? packedAt + randInt(4, 24) * HOUR : null;
    const deliveredAt = delivered
      ? (daysAgo === 0 ? createdAtMs + randInt(3, 6) * HOUR : (shippedAt || createdAtMs) + randInt(1, 3) * DAY)
      : null;

    const slaDeadline = forceSlaBreached
      ? createdAtMs + randInt(6, 20) * HOUR // already in the past
      : createdAtMs + 48 * HOUR;

    const finalized = delivered && rand() < 0.75;
    const tax = finalized ? Math.round(subtotal * 0.18) : 0;
    const total = subtotal + tax;
    const invoiceNumber = finalized ? `SC-MUM-${String(invoiceSeq++).padStart(4, '0')}` : null;
    const pointsEarned = delivered ? Math.round(total / 100) : 0;

    order_items.push(...items);
    if (pointsEarned > 0) {
      fume_points_ledger.push({
        id: `ledger_${orderSeq}`, customer_id: customerId, points: pointsEarned, type: 'earn',
        reason: `Order SC-${orderSeq}`, order_id: id, created_by: DEMO_USER_ID, created_at: new Date(deliveredAt || createdAtMs).toISOString(),
      });
      const cust = customers.find((c) => c.id === customerId);
      if (cust) cust.fume_points_balance += pointsEarned;
    }

    // A slice of online orders convert through an active offer (drives Growth attribution).
    const offerId = rand() < 0.14 && ['website', 'instagram'].includes(channel)
      ? (storeId === 'store_mumbai' ? 'offer_1' : 'offer_2')
      : null;

    orders.push({
      id, order_number: `SC-${orderSeq}`,
      offer_id: offerId,
      invoice_number: invoiceNumber, invoice_date: finalized ? new Date(deliveredAt!).toISOString() : null,
      status: cancelled ? 'cancelled' : delivered ? 'confirmed' : 'pending',
      channel,
      fulfillment_status: fulfillment,
      fulfillment_type: channel === 'walk_in' || channel === 'in_store' ? 'pickup' : 'self_ship',
      payment_type: paymentType,
      sla_deadline: new Date(slaDeadline).toISOString(),
      items_count: items.reduce((s, it) => s + it.quantity, 0),
      external_channel_order_number: channel === 'amazon' ? `AMZ-${40000 + orderSeq}` : channel === 'instagram' ? `IG-${1000 + orderSeq}` : channel === 'website' ? `WEB-${7000 + orderSeq}` : channel === 'ondc' ? `ONDC-${90000 + orderSeq}` : null,
      is_finalized: finalized, is_voided: false, void_reason: null, voided_at: null,
      subtotal, tax, total,
      cgst_rate: finalized ? 9 : 0, sgst_rate: finalized ? 9 : 0, igst_rate: 0, cess_rate: 0,
      cgst_amount: finalized ? Math.round(tax / 2) : 0, sgst_amount: finalized ? tax - Math.round(tax / 2) : 0, igst_amount: 0, cess_amount: 0,
      place_of_supply_state: finalized ? (storeId === 'store_mumbai' ? 'Maharashtra' : 'Delhi') : null,
      place_of_supply_code: finalized ? (storeId === 'store_mumbai' ? '27' : '07') : null,
      notes: rand() < 0.1 ? pickOne(['Gift wrap requested', 'Customer asked for early delivery', 'Call before delivery', 'Fragile — pack carefully']) : null,
      shipping_address: customers.find((c) => c.id === customerId)?.address || 'India',
      billing_address: customers.find((c) => c.id === customerId)?.address || 'India',
      fume_points_earned: pointsEarned, fume_points_redeemed: 0,
      created_at: createdAt,
      accepted_at: acceptedAt ? new Date(acceptedAt).toISOString() : null,
      packed_at: packedAt ? new Date(packedAt).toISOString() : null,
      shipped_at: shippedAt ? new Date(shippedAt).toISOString() : null,
      delivered_at: deliveredAt ? new Date(deliveredAt).toISOString() : null,
      declined_reason: null,
      cancelled_reason: cancelled ? pickOne(['Customer changed mind', 'Address unserviceable', 'Payment failed']) : null,
      store_id: storeId, customer_id: customerId,
      created_by: rand() < 0.3 ? 'sales-001' : DEMO_USER_ID,
    });
  };

  // history: 89 days ago -> yesterday
  for (let d = 89; d >= 1; d--) {
    const date = new Date(now.getTime() - d * DAY);
    const weekday = date.getDay();
    const growth = d > 60 ? 1.1 : d > 30 ? 1.7 : 2.4;
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.6 : 1;
    const count = Math.max(0, Math.round(growth * weekendBoost + (rand() - 0.35) * 2));
    for (let i = 0; i < count; i++) {
      const ms = date.getTime() - date.getHours() * HOUR + (9 + rand() * 12) * HOUR;
      makeOrder(Math.min(ms, now.getTime() - d * DAY), d);
    }
  }

  // today: a steady trickle ending "just now"
  const todayCount = 5;
  for (let i = todayCount - 1; i >= 0; i--) {
    const backoff = (i + 0.5) * 1.6 * HOUR;
    const ms = Math.max(localMidnight + 10 * 60 * 1000 * (todayCount - i), now.getTime() - backoff);
    makeOrder(ms, 0);
  }

  // two overdue-SLA orders stuck in the queue (fuel for the action queue)
  makeOrder(now.getTime() - 2.2 * DAY, 2, 'accepted', true);
  makeOrder(now.getTime() - 1.4 * DAY, 1, 'packed', true);

  // three parcels bounced at the doorstep — fuel for the NDR workbench
  makeOrder(now.getTime() - 1.1 * DAY, 1, 'failed_delivery');
  makeOrder(now.getTime() - 1.8 * DAY, 1, 'failed_delivery');
  makeOrder(now.getTime() - 2.6 * DAY, 2, 'failed_delivery');
  // spread the bounced parcels across both stores so each panel has work
  orders.filter((o) => o.fulfillment_status === 'failed_delivery').forEach((o, i) => {
    o.store_id = i % 2 === 0 ? 'store_delhi' : 'store_mumbai';
  });

  orders.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  // ---- Inventory -------------------------------------------------------------
  const store_inventory: DemoRow[] = [];
  let invSeq = 1;
  for (const store of stores) {
    for (const p of products) {
      if (rand() < 0.15) continue; // each store skips a couple of SKUs
      const variant = product_variants.find((v) => v.product_id === p.id);
      store_inventory.push({
        id: `inv_${invSeq++}`,
        store_id: store.id, cigar_id: p.id, product_id: p.id,
        variant_id: variant?.id || null,
        quantity: randInt(6, 32), min_stock_level: randInt(5, 10),
        updated_at: iso(randInt(0, 3)),
      });
    }
  }
  // force believable low-stock signals
  const forceStock = (storeId: string, productId: string, quantity: number, min: number) => {
    const row = store_inventory.find((r) => r.store_id === storeId && r.product_id === productId);
    if (row) { row.quantity = quantity; row.min_stock_level = min; }
    else store_inventory.push({ id: `inv_${invSeq++}`, store_id: storeId, cigar_id: productId, product_id: productId, variant_id: null, quantity, min_stock_level: min, updated_at: iso(0, -2) });
  };
  forceStock('store_mumbai', 'prod_cotton_shirt', 3, 10);
  forceStock('store_mumbai', 'prod_weekend_tote', 0, 8);
  forceStock('store_delhi', 'prod_sneaker', 4, 7);

  // ---- Shipments for in-flight orders ----------------------------------------
  const shipments: DemoRow[] = [];
  const shipment_tracking_events: DemoRow[] = [];
  const providers = ['Shiprocket Demo', 'Delhivery Demo', 'BlueDart Demo'];
  const inFlight = orders.filter((o) => ['packed', 'in_transit'].includes(o.fulfillment_status) && new Date(o.created_at).getTime() > now.getTime() - 7 * DAY);
  inFlight.forEach((o, i) => {
    const shipped = o.fulfillment_status === 'in_transit';
    const shipId = `ship_${o.id}`;
    shipments.push({
      id: shipId, order_id: o.id, store_id: o.store_id,
      provider_name: providers[i % providers.length],
      tracking_id: `TRK-${o.order_number}`,
      status: shipped ? 'in_transit' : 'pickup_scheduled',
      pickup_address: o.store_id === 'store_mumbai' ? 'Bandra West, Mumbai' : 'Hauz Khas, New Delhi',
      pickup_scheduled_at: shipped ? o.shipped_at : iso(0, 4),
      estimated_delivery_at: iso(-2),
      quote_amount: randInt(89, 189), service_type: 'standard',
      rider_name: pickOne(['Vikram', 'Suresh', 'Anil', 'Ravi']), rider_phone: '+91 91111 11111',
      awb_number: `AWB${1000 + i}`, created_at: o.packed_at || o.created_at,
    });
    shipment_tracking_events.push({
      id: `track_${shipId}_1`, shipment_id: shipId, status: 'pickup_scheduled',
      description: 'Pickup scheduled from store', location: o.store_id === 'store_mumbai' ? 'Mumbai' : 'Delhi',
      timestamp: o.packed_at || o.created_at,
    });
    if (shipped) {
      shipment_tracking_events.push({
        id: `track_${shipId}_2`, shipment_id: shipId, status: 'in_transit',
        description: 'Shipment picked up and in transit', location: 'Regional hub',
        timestamp: o.shipped_at,
      });
    }
  });

  // ---- Returns ----------------------------------------------------------------
  const deliveredRecent = orders.filter((o) => o.fulfillment_status === 'delivered' && new Date(o.created_at).getTime() > now.getTime() - 14 * DAY);
  const return_requests: DemoRow[] = [];
  const return_request_items: DemoRow[] = [];
  deliveredRecent.slice(0, 3).forEach((o, i) => {
    const status = ['pending', 'approved', 'completed'][i];
    const firstItem = order_items.find((it) => it.order_id === o.id)!;
    const retId = `ret_${o.id}`;
    return_requests.push({
      id: retId, order_id: o.id, store_id: o.store_id, customer_id: o.customer_id,
      status, return_type: i === 0 ? 'exchange' : 'refund',
      reason: pickOne(['Size exchange requested', 'Color not as expected', 'Changed mind', 'Defective stitching']),
      notes: null, refund_amount: firstItem.unit_price, restock_items: true,
      created_by: DEMO_USER_ID, created_at: iso(i + 1),
      processed_at: status === 'completed' ? iso(i) : null,
    });
    return_request_items.push({
      id: `ret_item_${o.id}`, return_request_id: retId, order_item_id: firstItem.id,
      quantity: 1, unit_price: firstItem.unit_price,
      cigar_id: firstItem.product_id, product_id: firstItem.product_id, variant_id: firstItem.variant_id,
    });
  });

  // ---- Settlements (weekly, from delivered prepaid orders) ---------------------
  const settlements: DemoRow[] = [];
  const onlineChannels = ['website', 'amazon', 'instagram'];
  for (const store of stores) {
    for (let week = 0; week < 8; week++) {
      for (const channel of onlineChannels) {
        const weekOrders = orders.filter((o) => {
          const age = (now.getTime() - new Date(o.created_at).getTime()) / DAY;
          return o.store_id === store.id && o.channel === channel && o.payment_type === 'prepaid'
            && o.fulfillment_status === 'delivered' && age >= week * 7 && age < (week + 1) * 7;
        });
        if (weekOrders.length === 0) continue;
        const gross = weekOrders.reduce((s, o) => s + o.total, 0);
        const commission = Math.round(gross * (channel === 'website' ? 0.02 : 0.08));
        const shippingDeduction = weekOrders.length * 65;
        const tds = Math.round(gross * 0.01);
        settlements.push({
          id: `set_${store.id}_${week}_${channel}`, store_id: store.id, settlement_date: dateOnly(week * 7),
          channel, gross_amount: gross, commission, shipping_deduction: shippingDeduction, tds,
          fees: commission + shippingDeduction + tds,
          net_amount: gross - commission - shippingDeduction - tds,
          orders_count: weekOrders.length,
          reference_number: `UTR${store.id === 'store_mumbai' ? 'M' : 'D'}${String(week).padStart(2, '0')}${channel.slice(0, 2).toUpperCase()}${1000 + week * 17}`,
          status: week === 0 ? 'pending' : 'settled', created_at: iso(week * 7),
        });
      }
    }
  }

  // ---- COD reconciliation -------------------------------------------------------
  const cod_reconciliation = orders
    .filter((o) => o.payment_type === 'cod' && o.fulfillment_status === 'delivered' && new Date(o.created_at).getTime() > now.getTime() - 21 * DAY)
    .map((o, i) => {
      const pending = i % 5 < 2;
      return {
        id: `cod_${o.id}`, order_id: o.id, store_id: o.store_id,
        amount: o.total, expected_amount: o.total, collected_amount: pending ? 0 : o.total,
        status: pending ? 'pending' : 'reconciled',
        created_at: o.delivered_at || o.created_at,
      };
    });

  // ---- NDR records for bounced deliveries ---------------------------------------
  const ndrReasons = ['Customer unavailable at address', 'Address incomplete', 'Customer refused delivery', 'Phone unreachable'];
  const ndr_records = orders
    .filter((o) => o.fulfillment_status === 'failed_delivery')
    .map((o, i) => ({
      id: `ndr_${o.id}`,
      order_id: o.id,
      store_id: o.store_id,
      reason: ndrReasons[i % ndrReasons.length],
      attempts: 1 + (i % 2),
      status: 'action_required',
      courier_remark: pickOne(['Consignee not available, call attempted', 'Premises locked', 'Refused to accept shipment', 'Contact number not reachable']),
      last_attempt_at: iso(0, -(3 + i * 5)),
      created_at: iso(0, -(3 + i * 5)),
    }));

  // ---- Courier disputes (weight/damage/loss claims) -------------------------------
  const disputeCandidates = orders.filter(
    (o) => o.fulfillment_status === 'delivered' && o.fulfillment_type === 'self_ship'
      && new Date(o.created_at).getTime() < now.getTime() - 7 * DAY
  );
  const disputeSpecs: { type: string; status: string; note: string }[] = [
    { type: 'weight_dispute', status: 'open', note: 'Courier billed 1.8kg, actual packed weight 0.7kg' },
    { type: 'damaged', status: 'open', note: 'Customer photo shows crushed box; claim filed with courier' },
    { type: 'weight_dispute', status: 'won', note: 'Weight reconciliation accepted, credit issued' },
  ];
  const delhiCandidates = disputeCandidates.filter((o) => o.store_id === 'store_delhi');
  const mumbaiCandidates = disputeCandidates.filter((o) => o.store_id === 'store_mumbai');
  const courier_disputes = disputeSpecs
    .map((spec, i) => {
      // alternate stores so both panels have dispute work
      const order = i % 2 === 0 ? delhiCandidates[i] : mumbaiCandidates[i];
      if (!order) return null;
      return {
        id: `dispute_${order.id}`,
        store_id: order.store_id,
        order_id: order.id,
        order_number: order.order_number,
        courier: providers[i % providers.length],
        type: spec.type,
        status: spec.status,
        claimed_amount: spec.type === 'weight_dispute' ? randInt(60, 220) : Math.round(order.total * 0.8),
        notes: spec.note,
        opened_at: iso(randInt(1, 6)),
        created_at: iso(randInt(1, 6)),
      };
    })
    .filter(Boolean) as DemoRow[];

  // ---- Operating expenses (rent, payroll, ads…) for the true P&L -----------------
  const expenses: DemoRow[] = [];
  let expSeq = 1;
  const addExpense = (storeId: string, category: string, amount: number, note: string, daysAgo: number) => {
    expenses.push({ id: `exp_${expSeq++}`, store_id: storeId, category, amount, note, incurred_at: iso(daysAgo), created_at: iso(daysAgo) });
  };
  for (const store of stores) {
    const isMumbai = store.id === 'store_mumbai';
    for (let m = 0; m < 3; m++) {
      addExpense(store.id, 'Rent', isMumbai ? 38000 : 30000, 'Store rent', 12 + m * 30);
      addExpense(store.id, 'Salaries', isMumbai ? 52000 : 41000, 'Store staff payroll', 2 + m * 30);
      addExpense(store.id, 'Software', 1999, 'Tools & subscriptions', 8 + m * 30);
    }
    for (let d = 85; d >= 0; d -= 7) {
      addExpense(store.id, 'Marketing', randInt(2500, 7000), 'Meta & Google ads', d);
      if (d % 14 === 0) addExpense(store.id, 'Packaging', randInt(1200, 2800), 'Boxes, mailers, tape', d);
    }
  }

  // ---- Sales target: computed from this month's real orders --------------------
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const achievedThisMonth = orders
    .filter((o) => o.fulfillment_status !== 'cancelled' && new Date(o.created_at) >= monthStart)
    .reduce((s, o) => s + o.total, 0);
  const sales_targets = [{
    id: 'target_1', user_id: DEMO_USER_ID,
    target_amount: Math.max(250000, Math.round(achievedThisMonth * 1.45 / 5000) * 5000),
    achieved_amount: achievedThisMonth,
    period: 'monthly',
    start_date: monthStart.toISOString().slice(0, 10),
    end_date: monthEnd.toISOString().slice(0, 10),
    created_at: iso(15),
  }];

  // ---- Misc tables ---------------------------------------------------------------
  const channel_accounts = [
    { id: 'chan_web', channel: 'website', display_name: 'SeeCen Web Store', is_active: true, last_sync_at: iso(0, -2), created_at: iso(125) },
    { id: 'chan_amz', channel: 'amazon', display_name: 'Amazon India', is_active: true, last_sync_at: iso(0, -5), created_at: iso(118) },
    { id: 'chan_ig', channel: 'instagram', display_name: 'Instagram Shop', is_active: true, last_sync_at: iso(0, -3), created_at: iso(90) },
    { id: 'chan_ondc', channel: 'ondc', display_name: 'ONDC Network', is_active: true, last_sync_at: iso(0, -1), created_at: iso(45) },
  ];

  const channel_sync_logs = [
    { id: 'sync_1', channel_account_id: 'chan_web', channel: 'website', status: 'success', message: '14 orders synced', records_processed: 14, started_at: iso(0, -2), completed_at: iso(0, -2) },
    { id: 'sync_2', channel_account_id: 'chan_amz', channel: 'amazon', status: 'warning', message: 'SKU mismatch on 1 listing', records_processed: 9, started_at: iso(0, -5), completed_at: iso(0, -5) },
    { id: 'sync_3', channel_account_id: 'chan_ig', channel: 'instagram', status: 'success', message: '6 orders synced', records_processed: 6, started_at: iso(0, -3), completed_at: iso(0, -3) },
  ];

  const pendingReturns = return_requests.filter((r) => r.status === 'pending').length;
  const lowStockCount = store_inventory.filter((r) => Number(r.quantity) <= Number(r.min_stock_level)).length;

  const notifications = [
    { id: 'note_1', user_id: DEMO_USER_ID, title: 'Low stock alert', message: 'Oxford Cotton Shirt is below threshold in Mumbai.', type: 'inventory', is_read: false, created_at: iso(0, -4) },
    { id: 'note_2', user_id: DEMO_USER_ID, title: 'SLA at risk', message: '2 orders have crossed their dispatch SLA.', type: 'orders', is_read: false, created_at: iso(0, -2) },
    { id: 'note_3', user_id: null, title: 'Open-source demo mode', message: 'This is a sandbox. Use “Reset demo data” in the header to start fresh.', type: 'system', is_read: false, created_at: iso(0, -6) },
  ];

  const offers = [
    { id: 'offer_1', store_id: 'store_mumbai', name: 'Weekend Workwear Bundle', offer_type: 'bundle', discount_type: 'percentage', discount_value: 10, status: 'active', starts_at: dateOnly(10), ends_at: dateOnly(-10), product_id: 'prod_linen_blazer', created_at: iso(10) },
    { id: 'offer_2', store_id: 'store_delhi', name: 'Monsoon Footwear Fest', offer_type: 'discount', discount_type: 'percentage', discount_value: 15, status: 'active', starts_at: dateOnly(5), ends_at: dateOnly(-14), product_id: 'prod_sneaker', created_at: iso(5) },
  ];

  const aiSummary = `You have ${orders.filter((o) => !['delivered', 'cancelled'].includes(o.fulfillment_status)).length} open orders, ${pendingReturns} return${pendingReturns === 1 ? '' : 's'} awaiting review, and ${lowStockCount} low-stock SKUs. Clear the overdue SLA orders first, then restock the Oxford Cotton Shirt.`;

  const aiRecommendation = {
    dailySummary: aiSummary,
    cigarsToSell: [
      { cigarName: 'Oxford Cotton Shirt', reason: 'High conversion and only 3 left in Mumbai.', suggestedCustomers: ['Aanya Sharma', 'Karan Malhotra'], pitchLine: 'Pair it with the linen blazer for a polished weekday set.', urgency: 'High' },
      { cigarName: 'Weekend Canvas Tote', reason: 'Popular add-on for gift orders and out of stock in Mumbai.', suggestedCustomers: ['Nisha Iyer'], pitchLine: 'Add the tote to complete the travel-ready look.', urgency: 'Medium' },
    ],
    followUpCustomers: [
      { customerName: 'Rohan Kapoor', phone: '+91 90000 10002', reason: 'COD order accepted but not packed.', lastOrderDaysAgo: 2, suggestedProducts: ['Everyday Court Sneaker'], messageTemplate: 'Hi Rohan, your sneaker order is ready to move. Can we confirm delivery timing?', priority: 'High' },
    ],
    crossSellOpportunities: [
      { customerName: 'Aanya Sharma', currentPreference: 'Structured workwear', suggestedProduct: 'Weekend Canvas Tote', pitchReason: 'Complements blazer purchases and lifts basket value.', discount: '10%' },
    ],
    offerRecommendations: [
      { offerType: 'Bundle', targetCustomers: 'Recent shirt buyers', description: 'Shirt + tote weekend bundle', validReason: 'Improves attachment rate without deep discounting.' },
    ],
    incentiveCoaching: {
      currentProgress: `${Math.round((achievedThisMonth / sales_targets[0].target_amount) * 100)}%`,
      remainingAmount: `Rs ${(sales_targets[0].target_amount - achievedThisMonth).toLocaleString('en-IN')}`,
      daysLeft: Math.max(1, monthEnd.getDate() - now.getDate()),
      dailyNeeded: `Rs ${Math.round((sales_targets[0].target_amount - achievedThisMonth) / Math.max(1, monthEnd.getDate() - now.getDate())).toLocaleString('en-IN')}`,
      motivationalTip: 'Prioritize ready-to-ship orders and two cross-sells daily.',
      nextMilestone: `Rs ${Math.round(sales_targets[0].target_amount / 1000)}K monthly GMV`,
    },
    stockPriorities: [
      { cigarName: 'Oxford Cotton Shirt', currentStock: 3, action: 'Reorder 20 units', reason: 'Below safety stock in Mumbai.' },
      { cigarName: 'Weekend Canvas Tote', currentStock: 0, action: 'Transfer from Delhi or reorder', reason: 'Frequently attached to gift orders.' },
    ],
    weeklyGoals: [
      { goal: 'Close 8 pending follow-ups', metric: 'Follow-ups completed', deadline: dateOnly(-7) },
      { goal: 'Recover 3 low-stock SKUs', metric: 'Inventory health', deadline: dateOnly(-5) },
    ],
  };

  return {
    stores,
    profiles,
    user_roles,
    store_assignments,
    products,
    cigars,
    product_variants,
    customers,
    orders,
    order_items,
    store_inventory,
    stock_requests: [
      { id: 'stock_req_1', store_id: 'store_mumbai', product_id: 'prod_cotton_shirt', cigar_id: 'prod_cotton_shirt', quantity_requested: 20, status: 'pending', created_at: iso(1), created_by: DEMO_USER_ID },
      { id: 'stock_req_2', store_id: 'store_mumbai', product_id: 'prod_weekend_tote', cigar_id: 'prod_weekend_tote', quantity_requested: 15, status: 'pending', created_at: iso(0, -5), created_by: DEMO_USER_ID },
    ],
    shipments,
    shipment_tracking_events,
    return_requests,
    return_request_items,
    ndr_records,
    courier_disputes,
    expenses,
    credit_notes: [],
    settlements,
    cod_reconciliation,
    channel_accounts,
    channel_sync_logs,
    sku_mappings: [
      { id: 'sku_1', channel_account_id: 'chan_amz', external_sku: 'AMZ-ST-CRT-42', product_id: 'prod_sneaker', cigar_id: 'prod_sneaker', variant_id: 'var_sneaker_42', created_at: iso(50) },
    ],
    offers,
    sales_targets,
    notifications,
    store_finance_settings: [
      { id: 'finance_mumbai', store_id: 'store_mumbai', legal_name: 'SeeCen Demo Retail Pvt Ltd', gstin: '27AAACS0000A1Z5', bank_name: 'Demo Bank', account_number: '0000000000', ifsc: 'DEMO0001234' },
      { id: 'finance_delhi', store_id: 'store_delhi', legal_name: 'SeeCen Demo Retail Pvt Ltd', gstin: '07AAACS0000A1Z5', bank_name: 'Demo Bank', account_number: '0000000001', ifsc: 'DEMO0001234' },
    ],
    store_tax_settings: [
      { id: 'tax_mumbai', store_id: 'store_mumbai', state_code: '27', state_name: 'Maharashtra', default_cgst_rate: 9, default_sgst_rate: 9, default_igst_rate: 18, default_cess_rate: 0, cess_enabled: false },
      { id: 'tax_delhi', store_id: 'store_delhi', state_code: '07', state_name: 'Delhi', default_cgst_rate: 9, default_sgst_rate: 9, default_igst_rate: 18, default_cess_rate: 0, cess_enabled: false },
    ],
    invoice_series: [{ id: 'inv_series_1', store_id: 'store_mumbai', prefix: 'SC-MUM-', next_number: invoiceSeq }],
    credit_note_series: [{ id: 'cn_series_1', store_id: 'store_mumbai', prefix: 'CN-MUM-', next_number: 1 }],
    fume_points_settings: [{ id: 'points_1', earn_rate: 1, redeem_rate: 1, min_redeem_points: 100, is_active: true }],
    fume_points_ledger,
    ai_coach_daily_recommendations: [
      { id: 'ai_today', user_id: DEMO_USER_ID, recommendation_date: dateOnly(0), daily_summary: aiRecommendation.dailySummary, cigars_to_push: aiRecommendation.cigarsToSell, follow_up_customers: aiRecommendation.followUpCustomers, cross_sell_opportunities: aiRecommendation.crossSellOpportunities, offer_recommendations: aiRecommendation.offerRecommendations, incentive_coaching: aiRecommendation.incentiveCoaching, stock_priorities: aiRecommendation.stockPriorities, analysis_context: null, created_at: iso(0), updated_at: iso(0) },
      { id: 'ai_yesterday', user_id: DEMO_USER_ID, recommendation_date: dateOnly(1), daily_summary: 'Yesterday focused on recovering packed orders and confirming COD deliveries.', cigars_to_push: aiRecommendation.cigarsToSell.slice(0, 1), follow_up_customers: [], cross_sell_opportunities: [], offer_recommendations: [], incentive_coaching: aiRecommendation.incentiveCoaching, stock_priorities: aiRecommendation.stockPriorities, analysis_context: null, created_at: iso(1), updated_at: iso(1) },
    ],
    finance_audit_logs: [],
  };
}
