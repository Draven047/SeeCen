// Channel Connector Interface & Mock Implementations

export type SalesChannel = 'in_store' | 'website' | 'instagram' | 'whatsapp' | 'marketplace' | 'csv_import';

export type FulfillmentStatus = 
  | 'new' | 'accepted' | 'picking' | 'packed' | 'ready' 
  | 'pickup_scheduled' | 'handover' | 'in_transit' | 'delivered'
  | 'declined' | 'cancelled' | 'partial_fulfilled' | 'failed_delivery' | 'rto'
  // legacy compat
  | 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'returned';

export type PaymentType = 'cod' | 'prepaid';
export type FulfillmentType = 'self_ship' | 'marketplace_logistics';

export interface ChannelOrder {
  external_order_id: string;
  external_channel_order_number: string;
  channel: SalesChannel;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: string;
  items: ChannelOrderItem[];
  subtotal: number;
  total: number;
  notes?: string;
  channel_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface ChannelOrderItem {
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info?: string;
}

export interface ChannelConnector {
  id: SalesChannel;
  name: string;
  icon: string;
  color: string;
  fetchOrders: () => Promise<ChannelOrder[]>;
  isConnected: boolean;
}

// Channel display config
export const CHANNEL_CONFIG: Record<SalesChannel, { label: string; icon: string; color: string }> = {
  in_store: { label: 'In-Store', icon: 'Store', color: 'bg-emerald-500/10 text-emerald-600' },
  website: { label: 'Website', icon: 'Globe', color: 'bg-blue-500/10 text-blue-600' },
  instagram: { label: 'Instagram', icon: 'Instagram', color: 'bg-pink-500/10 text-pink-600' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'bg-green-500/10 text-green-600' },
  marketplace: { label: 'Marketplace', icon: 'ShoppingCart', color: 'bg-orange-500/10 text-orange-600' },
  csv_import: { label: 'CSV Import', icon: 'FileSpreadsheet', color: 'bg-violet-500/10 text-violet-600' },
};

// Extended fulfillment status config
export const FULFILLMENT_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  new: { label: 'New', color: 'bg-blue-500/10 text-blue-600', step: 0 },
  accepted: { label: 'Accepted', color: 'bg-indigo-500/10 text-indigo-600', step: 1 },
  picking: { label: 'Picking', color: 'bg-yellow-500/10 text-yellow-600', step: 2 },
  packed: { label: 'Packed', color: 'bg-amber-500/10 text-amber-600', step: 3 },
  ready: { label: 'Ready', color: 'bg-teal-500/10 text-teal-600', step: 4 },
  pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-cyan-500/10 text-cyan-600', step: 5 },
  handover: { label: 'Handed Over', color: 'bg-sky-500/10 text-sky-600', step: 5 },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/10 text-purple-600', step: 6 },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600', step: 7 },
  // Edge states
  declined: { label: 'Declined', color: 'bg-red-500/10 text-red-600', step: -1 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-600', step: -1 },
  partial_fulfilled: { label: 'Partial', color: 'bg-orange-500/10 text-orange-600', step: -1 },
  failed_delivery: { label: 'Failed Delivery', color: 'bg-red-500/10 text-red-600', step: -1 },
  rto: { label: 'RTO', color: 'bg-rose-500/10 text-rose-600', step: -1 },
  // legacy compat
  unfulfilled: { label: 'Unfulfilled', color: 'bg-yellow-500/10 text-yellow-600', step: 0 },
  partially_fulfilled: { label: 'Partial', color: 'bg-blue-500/10 text-blue-600', step: -1 },
  fulfilled: { label: 'Fulfilled', color: 'bg-emerald-500/10 text-emerald-600', step: 7 },
  returned: { label: 'Returned', color: 'bg-red-500/10 text-red-600', step: -1 },
};

// Timeline steps for the order detail page
export const TIMELINE_STEPS = [
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picking', label: 'Picking' },
  { key: 'packed', label: 'Packed' },
  { key: 'ready', label: 'Ready' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

export const EDGE_STATES = ['declined', 'cancelled', 'partial_fulfilled', 'failed_delivery', 'rto'];

// SLA calculation
export function getSlaStatus(deadline: string | null): { label: string; color: string; urgent: boolean } {
  if (!deadline) return { label: 'No SLA', color: 'text-muted-foreground', urgent: false };
  const now = new Date();
  const sla = new Date(deadline);
  const hoursLeft = (sla.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) return { label: 'Breached', color: 'text-destructive', urgent: true };
  if (hoursLeft < 2) return { label: `${Math.max(0, Math.round(hoursLeft * 60))}m left`, color: 'text-destructive', urgent: true };
  if (hoursLeft < 6) return { label: `${Math.round(hoursLeft)}h left`, color: 'text-warning', urgent: true };
  if (hoursLeft < 24) return { label: `${Math.round(hoursLeft)}h left`, color: 'text-info', urgent: false };
  return { label: `${Math.round(hoursLeft / 24)}d left`, color: 'text-muted-foreground', urgent: false };
}

// ---- Mock Connectors ----
export const mockInstagramConnector: ChannelConnector = {
  id: 'instagram', name: 'Instagram Shop', icon: 'Instagram', color: 'text-pink-500', isConnected: false, fetchOrders: async () => [],
};
export const mockWhatsAppConnector: ChannelConnector = {
  id: 'whatsapp', name: 'WhatsApp Business', icon: 'MessageCircle', color: 'text-green-500', isConnected: false, fetchOrders: async () => [],
};
export const mockWebsiteConnector: ChannelConnector = {
  id: 'website', name: 'Clozzet Website', icon: 'Globe', color: 'text-blue-500', isConnected: false, fetchOrders: async () => [],
};
export const mockMarketplaceConnector: ChannelConnector = {
  id: 'marketplace', name: 'Marketplace (Myntra, Ajio)', icon: 'ShoppingCart', color: 'text-orange-500', isConnected: false, fetchOrders: async () => [],
};

export const allConnectors: ChannelConnector[] = [
  mockInstagramConnector, mockWhatsAppConnector, mockWebsiteConnector, mockMarketplaceConnector,
];

// ---- CSV Parser ----
export interface CSVParseResult {
  orders: ChannelOrder[];
  errors: string[];
  rowCount: number;
}

export function parseCSVOrders(csvText: string): CSVParseResult {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { orders: [], errors: ['CSV file is empty or has no data rows'], rowCount: 0 };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const orders: ChannelOrder[] = [];
  const errors: string[] = [];

  const requiredHeaders = ['customer_name', 'product_name', 'quantity', 'unit_price'];
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    return { orders: [], errors: [`Missing required columns: ${missing.join(', ')}`], rowCount: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length < headers.length) { errors.push(`Row ${i + 1}: insufficient columns`); continue; }

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    const qty = parseInt(row.quantity || '0');
    const price = parseFloat(row.unit_price || '0');
    if (isNaN(qty) || qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    if (isNaN(price) || price <= 0) { errors.push(`Row ${i + 1}: invalid unit_price`); continue; }

    const totalPrice = qty * price;
    const extId = row.external_order_id || `CSV-${Date.now()}-${i}`;

    const existing = orders.find(o => o.external_order_id === extId);
    if (existing) {
      existing.items.push({ product_name: row.product_name, sku: row.sku || undefined, quantity: qty, unit_price: price, total_price: totalPrice, variant_info: row.variant_info || undefined });
      existing.subtotal += totalPrice;
      existing.total += totalPrice;
    } else {
      orders.push({
        external_order_id: extId,
        external_channel_order_number: row.order_number || extId,
        channel: 'csv_import',
        customer_name: row.customer_name,
        customer_phone: row.customer_phone || undefined,
        customer_email: row.customer_email || undefined,
        shipping_address: row.shipping_address || undefined,
        items: [{ product_name: row.product_name, sku: row.sku || undefined, quantity: qty, unit_price: price, total_price: totalPrice, variant_info: row.variant_info || undefined }],
        subtotal: totalPrice,
        total: parseFloat(row.total || '') || totalPrice,
        notes: row.notes || undefined,
        created_at: row.order_date || undefined,
      });
    }
  }

  return { orders, errors, rowCount: lines.length - 1 };
}
