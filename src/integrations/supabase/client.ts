type DemoRow = Record<string, any>;
type DemoTables = Record<string, DemoRow[]>;
type Filter = { field: string; op: string; value: any };

const demoUser = {
  id: 'demo-admin',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@seecen.dev',
  phone: '',
  app_metadata: {},
  user_metadata: { full_name: 'Demo Admin' },
  identities: [],
  created_at: '2026-06-01T09:00:00.000Z',
  updated_at: '2026-06-16T09:00:00.000Z',
};

const demoSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 60 * 60 * 24,
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  token_type: 'bearer',
  user: demoUser,
};

const now = new Date('2026-06-16T08:30:00.000Z');
const day = 24 * 60 * 60 * 1000;
const iso = (daysAgo = 0, hours = 0) => new Date(now.getTime() - daysAgo * day + hours * 60 * 60 * 1000).toISOString();
const dateOnly = (daysAgo = 0) => iso(daysAgo).slice(0, 10);
const clone = <T>(value: T): T => value == null ? value : JSON.parse(JSON.stringify(value));
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

const seedTables = (): DemoTables => {
  const stores = [
    { id: 'store_mumbai', name: 'SeeCen Mumbai', address: 'Bandra West, Mumbai', phone: '+91 98765 00011', created_at: iso(80) },
    { id: 'store_delhi', name: 'SeeCen Delhi', address: 'Hauz Khas, New Delhi', phone: '+91 98765 00012', created_at: iso(70) },
  ];

  const profiles = [
    { id: demoUser.id, email: demoUser.email, full_name: 'Demo Admin', created_at: iso(60), updated_at: iso(1) },
    { id: 'sales-001', email: 'maya@seecen.dev', full_name: 'Maya Rao', created_at: iso(54), updated_at: iso(2) },
    { id: 'ops-001', email: 'arjun@seecen.dev', full_name: 'Arjun Mehta', created_at: iso(45), updated_at: iso(2) },
  ];

  const user_roles = [
    { id: 'role_demo', user_id: demoUser.id, role: 'admin', is_approved: true, created_at: iso(60) },
    { id: 'role_sales', user_id: 'sales-001', role: 'sales', is_approved: true, created_at: iso(54) },
    { id: 'role_pending', user_id: 'pending-001', role: 'sales', is_approved: false, created_at: iso(3) },
  ];

  const store_assignments = [
    { id: 'assign_demo_mumbai', user_id: demoUser.id, store_id: 'store_mumbai', created_at: iso(60) },
    { id: 'assign_demo_delhi', user_id: demoUser.id, store_id: 'store_delhi', created_at: iso(60) },
    { id: 'assign_sales_mumbai', user_id: 'sales-001', store_id: 'store_mumbai', created_at: iso(54) },
  ];

  const products = [
    { id: 'prod_linen_blazer', name: 'Linen Utility Blazer', brand: 'Northstar', category: 'Outerwear', description: 'Breathable structured blazer for city commutes.', base_price: 4290, mrp: 4990, price: 4290, sku: 'NS-BLZ-LIN', image_urls: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'], is_active: true, created_at: iso(40), updated_at: iso(1) },
    { id: 'prod_cotton_shirt', name: 'Oxford Cotton Shirt', brand: 'CenWear', category: 'Tops & Shirts', description: 'Crisp everyday button down.', base_price: 1890, mrp: 2290, price: 1890, sku: 'CW-OXF-WHT', image_urls: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80'], is_active: true, created_at: iso(35), updated_at: iso(1) },
    { id: 'prod_weekend_tote', name: 'Weekend Canvas Tote', brand: 'CenCarry', category: 'Accessories', description: 'Heavy canvas tote with laptop sleeve.', base_price: 1590, mrp: 1990, price: 1590, sku: 'CC-TOTE-CRM', image_urls: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80'], is_active: true, created_at: iso(30), updated_at: iso(1) },
    { id: 'prod_wrap_dress', name: 'Soft Wrap Dress', brand: 'Mira', category: 'Dresses', description: 'Drape-friendly wrap dress in modal blend.', base_price: 2790, mrp: 3290, price: 2790, sku: 'MR-WRAP-BLK', image_urls: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80'], is_active: true, created_at: iso(28), updated_at: iso(1) },
    { id: 'prod_sneaker', name: 'Everyday Court Sneaker', brand: 'Stride', category: 'Footwear', description: 'Minimal low-top sneaker with cushioned sole.', base_price: 3490, mrp: 3990, price: 3490, sku: 'ST-CRT-WHT', image_urls: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80'], is_active: true, created_at: iso(20), updated_at: iso(1) },
  ];

  const cigars = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.base_price, category: p.category, image_url: p.image_urls[0], is_active: p.is_active, created_at: p.created_at }));

  const product_variants = [
    { id: 'var_blazer_s', product_id: 'prod_linen_blazer', color: 'Sage', size: 'S', sku: 'NS-BLZ-SGE-S', price_adjustment: 0, is_active: true },
    { id: 'var_blazer_m', product_id: 'prod_linen_blazer', color: 'Sage', size: 'M', sku: 'NS-BLZ-SGE-M', price_adjustment: 0, is_active: true },
    { id: 'var_shirt_m', product_id: 'prod_cotton_shirt', color: 'White', size: 'M', sku: 'CW-OXF-WHT-M', price_adjustment: 0, is_active: true },
    { id: 'var_dress_m', product_id: 'prod_wrap_dress', color: 'Black', size: 'M', sku: 'MR-WRAP-BLK-M', price_adjustment: 0, is_active: true },
    { id: 'var_sneaker_42', product_id: 'prod_sneaker', color: 'White', size: '42', sku: 'ST-CRT-WHT-42', price_adjustment: 0, is_active: true },
  ];

  const customers = [
    { id: 'cust_aanya', name: 'Aanya Sharma', phone: '+91 90000 10001', email: 'aanya@example.com', address: 'Andheri West, Mumbai', date_of_birth: '1994-06-22', is_blacklisted: false, fume_points_balance: 460, created_by: demoUser.id, created_at: iso(36), updated_at: iso(2) },
    { id: 'cust_rohan', name: 'Rohan Kapoor', phone: '+91 90000 10002', email: 'rohan@example.com', address: 'Powai, Mumbai', date_of_birth: '1989-07-04', is_blacklisted: false, fume_points_balance: 320, created_by: demoUser.id, created_at: iso(31), updated_at: iso(5) },
    { id: 'cust_nisha', name: 'Nisha Iyer', phone: '+91 90000 10003', email: 'nisha@example.com', address: 'GK II, Delhi', date_of_birth: '1991-06-18', is_blacklisted: false, fume_points_balance: 740, created_by: 'sales-001', created_at: iso(22), updated_at: iso(1) },
    { id: 'cust_karan', name: 'Karan Malhotra', phone: '+91 90000 10004', email: 'karan@example.com', address: 'Saket, Delhi', date_of_birth: null, is_blacklisted: false, fume_points_balance: 120, created_by: demoUser.id, created_at: iso(18), updated_at: iso(6) },
  ];

  const orders = [
    { id: 'order_1001', order_number: 'SC-1001', invoice_number: 'SC-MUM-0007', invoice_date: iso(8), status: 'confirmed', channel: 'website', fulfillment_status: 'delivered', fulfillment_type: 'self_ship', payment_type: 'prepaid', sla_deadline: iso(6), items_count: 2, external_channel_order_number: 'WEB-7781', is_finalized: true, is_voided: false, void_reason: null, voided_at: null, subtotal: 6180, tax: 1112, total: 7292, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, cess_rate: 0, cgst_amount: 556, sgst_amount: 556, igst_amount: 0, cess_amount: 0, place_of_supply_state: 'Maharashtra', place_of_supply_code: '27', notes: 'Gift wrap requested', shipping_address: 'Andheri West, Mumbai', billing_address: 'Andheri West, Mumbai', fume_points_earned: 73, fume_points_redeemed: 0, created_at: iso(9), accepted_at: iso(9, 1), packed_at: iso(8), shipped_at: iso(8, 3), delivered_at: iso(6), declined_reason: null, cancelled_reason: null, store_id: 'store_mumbai', customer_id: 'cust_aanya', created_by: demoUser.id },
    { id: 'order_1002', order_number: 'SC-1002', invoice_number: null, invoice_date: null, status: 'pending', channel: 'amazon', fulfillment_status: 'accepted', fulfillment_type: 'self_ship', payment_type: 'cod', sla_deadline: iso(-1), items_count: 1, external_channel_order_number: 'AMZ-48291', is_finalized: false, is_voided: false, void_reason: null, voided_at: null, subtotal: 3490, tax: 0, total: 3490, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0, place_of_supply_state: null, place_of_supply_code: null, notes: null, shipping_address: 'Powai, Mumbai', billing_address: 'Powai, Mumbai', fume_points_earned: 0, fume_points_redeemed: 0, created_at: iso(2), accepted_at: iso(1), packed_at: null, shipped_at: null, delivered_at: null, declined_reason: null, cancelled_reason: null, store_id: 'store_mumbai', customer_id: 'cust_rohan', created_by: demoUser.id },
    { id: 'order_1003', order_number: 'SC-1003', invoice_number: null, invoice_date: null, status: 'pending', channel: 'instagram', fulfillment_status: 'packed', fulfillment_type: 'self_ship', payment_type: 'prepaid', sla_deadline: iso(1), items_count: 3, external_channel_order_number: 'IG-1422', is_finalized: false, is_voided: false, void_reason: null, voided_at: null, subtotal: 7570, tax: 0, total: 7570, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0, place_of_supply_state: null, place_of_supply_code: null, notes: 'Customer asked for early delivery', shipping_address: 'GK II, Delhi', billing_address: 'GK II, Delhi', fume_points_earned: 0, fume_points_redeemed: 150, created_at: iso(1), accepted_at: iso(1, 1), packed_at: iso(0, -3), shipped_at: null, delivered_at: null, declined_reason: null, cancelled_reason: null, store_id: 'store_delhi', customer_id: 'cust_nisha', created_by: 'sales-001' },
    { id: 'order_1004', order_number: 'SC-1004', invoice_number: null, invoice_date: null, status: 'pending', channel: 'walk_in', fulfillment_status: 'pending', fulfillment_type: 'pickup', payment_type: 'prepaid', sla_deadline: iso(2), items_count: 1, external_channel_order_number: null, is_finalized: false, is_voided: false, void_reason: null, voided_at: null, subtotal: 1590, tax: 0, total: 1590, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0, place_of_supply_state: null, place_of_supply_code: null, notes: null, shipping_address: 'Saket, Delhi', billing_address: 'Saket, Delhi', fume_points_earned: 0, fume_points_redeemed: 0, created_at: iso(0, -2), accepted_at: null, packed_at: null, shipped_at: null, delivered_at: null, declined_reason: null, cancelled_reason: null, store_id: 'store_delhi', customer_id: 'cust_karan', created_by: demoUser.id },
  ];

  const order_items = [
    { id: 'oi_1001_1', order_id: 'order_1001', product_id: 'prod_cotton_shirt', cigar_id: 'prod_cotton_shirt', variant_id: 'var_shirt_m', quantity: 1, unit_price: 1890, total_price: 1890 },
    { id: 'oi_1001_2', order_id: 'order_1001', product_id: 'prod_linen_blazer', cigar_id: 'prod_linen_blazer', variant_id: 'var_blazer_m', quantity: 1, unit_price: 4290, total_price: 4290 },
    { id: 'oi_1002_1', order_id: 'order_1002', product_id: 'prod_sneaker', cigar_id: 'prod_sneaker', variant_id: 'var_sneaker_42', quantity: 1, unit_price: 3490, total_price: 3490 },
    { id: 'oi_1003_1', order_id: 'order_1003', product_id: 'prod_wrap_dress', cigar_id: 'prod_wrap_dress', variant_id: 'var_dress_m', quantity: 2, unit_price: 2790, total_price: 5580 },
    { id: 'oi_1003_2', order_id: 'order_1003', product_id: 'prod_weekend_tote', cigar_id: 'prod_weekend_tote', variant_id: null, quantity: 1, unit_price: 1590, total_price: 1590 },
    { id: 'oi_1004_1', order_id: 'order_1004', product_id: 'prod_weekend_tote', cigar_id: 'prod_weekend_tote', variant_id: null, quantity: 1, unit_price: 1590, total_price: 1590 },
  ];

  const store_inventory = [
    { id: 'inv_mum_blazer', store_id: 'store_mumbai', cigar_id: 'prod_linen_blazer', product_id: 'prod_linen_blazer', variant_id: 'var_blazer_m', quantity: 8, min_stock_level: 6, updated_at: iso(1) },
    { id: 'inv_mum_shirt', store_id: 'store_mumbai', cigar_id: 'prod_cotton_shirt', product_id: 'prod_cotton_shirt', variant_id: 'var_shirt_m', quantity: 3, min_stock_level: 10, updated_at: iso(1) },
    { id: 'inv_mum_tote', store_id: 'store_mumbai', cigar_id: 'prod_weekend_tote', product_id: 'prod_weekend_tote', variant_id: null, quantity: 0, min_stock_level: 8, updated_at: iso(2) },
    { id: 'inv_del_dress', store_id: 'store_delhi', cigar_id: 'prod_wrap_dress', product_id: 'prod_wrap_dress', variant_id: 'var_dress_m', quantity: 14, min_stock_level: 6, updated_at: iso(1) },
    { id: 'inv_del_sneaker', store_id: 'store_delhi', cigar_id: 'prod_sneaker', product_id: 'prod_sneaker', variant_id: 'var_sneaker_42', quantity: 5, min_stock_level: 7, updated_at: iso(1) },
  ];

  const aiRecommendation = {
    dailySummary: 'Focus on low-stock cotton shirts, pending COD follow-ups, and packed Instagram orders before the SLA window closes.',
    cigarsToSell: [
      { cigarName: 'Oxford Cotton Shirt', reason: 'High conversion and only 3 left in Mumbai.', suggestedCustomers: ['Aanya Sharma', 'Karan Malhotra'], pitchLine: 'Pair it with the linen blazer for a polished weekday set.', urgency: 'High' },
      { cigarName: 'Weekend Canvas Tote', reason: 'Popular add-on for gift orders.', suggestedCustomers: ['Nisha Iyer'], pitchLine: 'Add the tote to complete the travel-ready look.', urgency: 'Medium' },
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
    incentiveCoaching: { currentProgress: '73%', remainingAmount: 'Rs 28,500', daysLeft: 14, dailyNeeded: 'Rs 2,040', motivationalTip: 'Prioritize ready-to-ship orders and two cross-sells daily.', nextMilestone: 'Rs 100K monthly GMV' },
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
      { id: 'stock_req_1', store_id: 'store_mumbai', product_id: 'prod_cotton_shirt', cigar_id: 'prod_cotton_shirt', quantity_requested: 20, status: 'pending', created_at: iso(1), created_by: demoUser.id },
    ],
    shipments: [
      { id: 'ship_1003', order_id: 'order_1003', store_id: 'store_delhi', provider_name: 'Shiprocket Demo', tracking_id: 'SR-DEMO-1003', status: 'pickup_scheduled', pickup_address: 'Hauz Khas, New Delhi', pickup_scheduled_at: iso(0, 4), estimated_delivery_at: iso(-3), quote_amount: 129, service_type: 'standard', rider_name: 'Vikram', rider_phone: '+91 91111 11111', awb_number: 'AWB1003', created_at: iso(0, -1) },
    ],
    shipment_tracking_events: [
      { id: 'track_1003_1', shipment_id: 'ship_1003', status: 'pickup_scheduled', description: 'Pickup scheduled from Delhi store', location: 'Delhi', timestamp: iso(0, -1) },
    ],
    return_requests: [
      { id: 'ret_1001', order_id: 'order_1001', store_id: 'store_mumbai', customer_id: 'cust_aanya', status: 'pending', return_type: 'exchange', reason: 'Size exchange requested', notes: null, refund_amount: 1890, restock_items: true, created_by: demoUser.id, created_at: iso(1), processed_at: null },
    ],
    return_request_items: [
      { id: 'ret_item_1001', return_request_id: 'ret_1001', order_item_id: 'oi_1001_1', quantity: 1, unit_price: 1890, cigar_id: 'prod_cotton_shirt', product_id: 'prod_cotton_shirt', variant_id: 'var_shirt_m' },
    ],
    credit_notes: [],
    settlements: [
      { id: 'set_1', store_id: 'store_mumbai', settlement_date: dateOnly(4), channel: 'website', gross_amount: 7292, fees: 146, net_amount: 7146, status: 'paid', created_at: iso(4) },
    ],
    cod_reconciliation: [
      { id: 'cod_1', order_id: 'order_1002', store_id: 'store_mumbai', amount: 3490, status: 'pending', created_at: iso(2) },
    ],
    channel_accounts: [
      { id: 'chan_web', channel: 'website', display_name: 'SeeCen Web Store', is_active: true, last_sync_at: iso(0, -2), created_at: iso(25) },
      { id: 'chan_amz', channel: 'amazon', display_name: 'Amazon India', is_active: true, last_sync_at: iso(1), created_at: iso(18) },
    ],
    channel_sync_logs: [
      { id: 'sync_1', channel_account_id: 'chan_web', channel: 'website', status: 'success', message: '12 orders synced', records_processed: 12, started_at: iso(0, -2), completed_at: iso(0, -2) },
      { id: 'sync_2', channel_account_id: 'chan_amz', channel: 'amazon', status: 'warning', message: 'SKU mismatch on 1 listing', records_processed: 8, started_at: iso(1), completed_at: iso(1) },
    ],
    sku_mappings: [
      { id: 'sku_1', channel_account_id: 'chan_amz', external_sku: 'AMZ-ST-CRT-42', product_id: 'prod_sneaker', cigar_id: 'prod_sneaker', variant_id: 'var_sneaker_42', created_at: iso(11) },
    ],
    offers: [
      { id: 'offer_1', name: 'Weekend Workwear Bundle', offer_type: 'bundle', discount_type: 'percentage', discount_value: 10, status: 'active', starts_at: dateOnly(2), ends_at: dateOnly(-8), product_id: 'prod_linen_blazer', created_at: iso(2) },
    ],
    sales_targets: [
      { id: 'target_1', user_id: demoUser.id, target_amount: 100000, achieved_amount: 71500, period: 'monthly', start_date: '2026-06-01', end_date: '2026-06-30', created_at: iso(15) },
    ],
    notifications: [
      { id: 'note_1', user_id: demoUser.id, title: 'Low stock alert', message: 'Oxford Cotton Shirt is below threshold in Mumbai.', type: 'inventory', is_read: false, created_at: iso(0, -4) },
      { id: 'note_2', user_id: null, title: 'Open-source demo mode', message: 'All changes reset when the browser refreshes.', type: 'system', is_read: false, created_at: iso(0, -3) },
    ],
    store_finance_settings: [
      { id: 'finance_mumbai', store_id: 'store_mumbai', legal_name: 'SeeCen Demo Retail Pvt Ltd', gstin: '27AAACS0000A1Z5', bank_name: 'Demo Bank', account_number: '0000000000', ifsc: 'DEMO0001234' },
      { id: 'finance_delhi', store_id: 'store_delhi', legal_name: 'SeeCen Demo Retail Pvt Ltd', gstin: '07AAACS0000A1Z5', bank_name: 'Demo Bank', account_number: '0000000001', ifsc: 'DEMO0001234' },
    ],
    store_tax_settings: [
      { id: 'tax_mumbai', store_id: 'store_mumbai', state_code: '27', state_name: 'Maharashtra', default_cgst_rate: 9, default_sgst_rate: 9, default_igst_rate: 18, default_cess_rate: 0, cess_enabled: false },
      { id: 'tax_delhi', store_id: 'store_delhi', state_code: '07', state_name: 'Delhi', default_cgst_rate: 9, default_sgst_rate: 9, default_igst_rate: 18, default_cess_rate: 0, cess_enabled: false },
    ],
    invoice_series: [{ id: 'inv_series_1', store_id: 'store_mumbai', prefix: 'SC-MUM-', next_number: 8 }],
    credit_note_series: [{ id: 'cn_series_1', store_id: 'store_mumbai', prefix: 'CN-MUM-', next_number: 1 }],
    fume_points_settings: [{ id: 'points_1', earn_rate: 1, redeem_rate: 1, min_redeem_points: 100, is_active: true }],
    fume_points_ledger: [
      { id: 'ledger_1', customer_id: 'cust_aanya', points: 73, type: 'earn', reason: 'Order SC-1001', order_id: 'order_1001', created_by: demoUser.id, created_at: iso(8) },
    ],
    ai_coach_daily_recommendations: [
      { id: 'ai_today', user_id: demoUser.id, recommendation_date: dateOnly(0), daily_summary: aiRecommendation.dailySummary, cigars_to_push: aiRecommendation.cigarsToSell, follow_up_customers: aiRecommendation.followUpCustomers, cross_sell_opportunities: aiRecommendation.crossSellOpportunities, offer_recommendations: aiRecommendation.offerRecommendations, incentive_coaching: aiRecommendation.incentiveCoaching, stock_priorities: aiRecommendation.stockPriorities, analysis_context: buildAiContext(orders, customers), created_at: iso(0), updated_at: iso(0) },
      { id: 'ai_yesterday', user_id: demoUser.id, recommendation_date: dateOnly(1), daily_summary: 'Yesterday focused on recovering packed orders and confirming COD deliveries.', cigars_to_push: aiRecommendation.cigarsToSell.slice(0, 1), follow_up_customers: [], cross_sell_opportunities: [], offer_recommendations: [], incentive_coaching: aiRecommendation.incentiveCoaching, stock_priorities: aiRecommendation.stockPriorities, analysis_context: buildAiContext(orders, customers), created_at: iso(1), updated_at: iso(1) },
    ],
    finance_audit_logs: [],
  };
};

let db = seedTables();

function buildAiContext(orders = db?.orders || [], customers = db?.customers || []) {
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return {
    salespersonName: 'Demo Admin',
    totalCustomers: customers.length,
    customersNeedingFollowUp: orders.filter((order) => ['pending', 'accepted'].includes(order.fulfillment_status)).length,
    upcomingBirthdaysCount: customers.filter((customer) => String(customer.date_of_birth || '').slice(5, 7) === '06').length,
    highValueCustomersCount: customers.filter((customer) => Number(customer.fume_points_balance || 0) > 400).length,
    totalOrders: orders.length,
    ordersThisMonth: orders.length,
    totalRevenue,
    revenueThisMonth: totalRevenue,
    avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
    targetAmount: 100000,
    achievedAmount: 71500,
    targetProgress: '71.5',
    remainingToTarget: 28500,
    daysLeftInQuarter: 14,
    dailyTargetNeeded: 2040,
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
    } else if (this.action === 'update') {
      affected = table.filter((row) => this.matches(row));
      affected.forEach((row) => Object.assign(row, clone(this.payload), { updated_at: new Date().toISOString() }));
      rows = affected;
    } else if (this.action === 'delete') {
      affected = table.filter((row) => this.matches(row));
      db[this.table] = table.filter((row) => !this.matches(row));
      rows = affected;
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
    .filter(Boolean);
  const recommendations = {
    dailySummary: `You have ${context.totalOrders} demo orders, ${context.customersNeedingFollowUp} follow-ups, and ${lowStock.length} stock priorities. Start with packed orders and low-stock winners.`,
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
    incentiveCoaching: { currentProgress: '71.5%', remainingAmount: 'Rs 28,500', daysLeft: 14, dailyNeeded: 'Rs 2,040', motivationalTip: 'Close two follow-ups before noon and one cross-sell after lunch.', nextMilestone: 'Rs 100K monthly GMV' },
    stockPriorities: lowStock.map((name) => ({ cigarName: name, currentStock: 3, action: 'Replenish this week', reason: 'Below demo safety stock.' })),
    weeklyGoals: [
      { goal: 'Pack all accepted orders', metric: '0 accepted orders older than 24h', deadline: dateOnly(-2) },
      { goal: 'Replenish low-stock SKUs', metric: 'Low stock count below 2', deadline: dateOnly(-5) },
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

export const supabase = {
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
            ? 'Follow up with Rohan Kapoor first, then Aanya Sharma for the tote cross-sell. Both are seeded demo customers, so refresh resets their state.'
            : 'Today, prioritize packed orders, low-stock Oxford shirts, and one workwear bundle pitch. This coach is local and deterministic for the open-source demo.';
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
