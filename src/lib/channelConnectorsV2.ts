// Channel Connector Abstraction with Mock Implementations

import { parseCSVOrders, type ChannelOrder } from './channelConnectors';

export interface ChannelConnectorV2 {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  credentialFields: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[];
  pullOrders: (credentials: Record<string, string>) => Promise<ChannelOrder[]>;
  pushInventory: (credentials: Record<string, string>, items: { sku: string; quantity: number }[]) => Promise<{ success: number; failed: number }>;
  updateOrderStatus: (credentials: Record<string, string>, externalOrderId: string, status: string) => Promise<boolean>;
  pullReturns: (credentials: Record<string, string>) => Promise<{ orderId: string; reason: string; items: { sku: string; qty: number }[] }[]>;
  healthCheck: (credentials: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
}

// ---- Clozzet Website Mock ----
const clozzetMock: ChannelConnectorV2 = {
  id: 'clozzet_website',
  name: 'Clozzet Website',
  icon: 'Globe',
  color: 'bg-blue-500/10 text-blue-600',
  description: 'Your official Clozzet e-commerce storefront',
  credentialFields: [
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'clz_live_...' },
    { key: 'store_url', label: 'Store URL', type: 'text', placeholder: 'https://yourstore.clozzet.com' },
  ],
  pullOrders: async () => {
    await new Promise(r => setTimeout(r, 800));
    const now = Date.now();
    return [
      {
        external_order_id: `CLZ-${now}-1`,
        external_channel_order_number: `CLZ-${Math.floor(Math.random() * 9000) + 1000}`,
        channel: 'website' as const,
        customer_name: 'Priya Sharma',
        customer_phone: '+91 98765 12345',
        customer_email: 'priya@example.com',
        shipping_address: '42, MG Road, Bengaluru 560001',
        items: [
          { product_name: 'Cohiba Behike 56', quantity: 2, unit_price: 8500, total_price: 17000 },
          { product_name: 'Montecristo No. 4', quantity: 1, unit_price: 3200, total_price: 3200 },
        ],
        subtotal: 20200,
        total: 20200,
        notes: 'Gift wrapping requested',
      },
      {
        external_order_id: `CLZ-${now}-2`,
        external_channel_order_number: `CLZ-${Math.floor(Math.random() * 9000) + 1000}`,
        channel: 'website' as const,
        customer_name: 'Arjun Patel',
        customer_phone: '+91 87654 32109',
        shipping_address: '15, Linking Road, Mumbai 400050',
        items: [
          { product_name: 'Romeo y Julieta Short Churchill', quantity: 5, unit_price: 4500, total_price: 22500 },
        ],
        subtotal: 22500,
        total: 22500,
      },
    ];
  },
  pushInventory: async (_creds, items) => {
    await new Promise(r => setTimeout(r, 500));
    return { success: items.length, failed: 0 };
  },
  updateOrderStatus: async () => {
    await new Promise(r => setTimeout(r, 300));
    return true;
  },
  pullReturns: async () => {
    await new Promise(r => setTimeout(r, 400));
    return [
      { orderId: 'CLZ-RET-001', reason: 'Wrong size delivered', items: [{ sku: 'COH-BHK-56', qty: 1 }] },
    ];
  },
  healthCheck: async () => {
    await new Promise(r => setTimeout(r, 200));
    return { ok: true, message: 'Connected. API v2.1. Rate limit: 950/1000 remaining.' };
  },
};

// ---- Amazon Mock ----
const amazonMock: ChannelConnectorV2 = {
  id: 'amazon',
  name: 'Amazon',
  icon: 'ShoppingCart',
  color: 'bg-amber-500/10 text-amber-700',
  description: 'Amazon India seller marketplace',
  credentialFields: [
    { key: 'seller_id', label: 'Seller ID', type: 'text', placeholder: 'A1B2C3D4E5...' },
    { key: 'mws_auth_token', label: 'MWS Auth Token', type: 'password', placeholder: 'amzn.mws.xxx...' },
    { key: 'marketplace_id', label: 'Marketplace ID', type: 'text', placeholder: 'A21TJRUUN4KGV' },
  ],
  pullOrders: async () => {
    await new Promise(r => setTimeout(r, 1000));
    const now = Date.now();
    return [
      {
        external_order_id: `AMZ-${now}-1`,
        external_channel_order_number: `402-${Math.floor(Math.random() * 9000000) + 1000000}-${Math.floor(Math.random() * 9000) + 1000}`,
        channel: 'marketplace' as const,
        customer_name: 'Vikram Singh',
        customer_phone: '+91 99887 76655',
        shipping_address: 'B-12, Sector 62, Noida 201301',
        items: [
          { product_name: 'Partagas Serie D No. 4', sku: 'PSD4-BOX5', quantity: 1, unit_price: 5800, total_price: 5800 },
        ],
        subtotal: 5800,
        total: 5800,
        channel_metadata: { fulfillment: 'FBA', prime: true },
      },
    ];
  },
  pushInventory: async (_creds, items) => {
    await new Promise(r => setTimeout(r, 600));
    const failed = Math.random() > 0.8 ? 1 : 0;
    return { success: items.length - failed, failed };
  },
  updateOrderStatus: async () => {
    await new Promise(r => setTimeout(r, 400));
    return true;
  },
  pullReturns: async () => {
    await new Promise(r => setTimeout(r, 500));
    return [];
  },
  healthCheck: async () => {
    await new Promise(r => setTimeout(r, 300));
    return { ok: true, message: 'SP-API connected. Seller ID verified. Throttle: OK.' };
  },
};

// ---- Flipkart Mock ----
const flipkartMock: ChannelConnectorV2 = {
  id: 'flipkart',
  name: 'Flipkart',
  icon: 'ShoppingBag',
  color: 'bg-yellow-500/10 text-yellow-700',
  description: 'Flipkart seller marketplace',
  credentialFields: [
    { key: 'application_id', label: 'Application ID', type: 'text', placeholder: 'fk-app-xxx' },
    { key: 'application_secret', label: 'Application Secret', type: 'password', placeholder: 'fk-secret-xxx' },
  ],
  pullOrders: async () => {
    await new Promise(r => setTimeout(r, 900));
    const now = Date.now();
    return [
      {
        external_order_id: `FK-${now}-1`,
        external_channel_order_number: `OD${Math.floor(Math.random() * 90000000000) + 10000000000}`,
        channel: 'marketplace' as const,
        customer_name: 'Sneha Reddy',
        shipping_address: '78, Jubilee Hills, Hyderabad 500033',
        items: [
          { product_name: 'H. Upmann Magnum 46', quantity: 3, unit_price: 3800, total_price: 11400 },
        ],
        subtotal: 11400,
        total: 11400,
      },
    ];
  },
  pushInventory: async (_creds, items) => {
    await new Promise(r => setTimeout(r, 500));
    return { success: items.length, failed: 0 };
  },
  updateOrderStatus: async () => {
    await new Promise(r => setTimeout(r, 300));
    return true;
  },
  pullReturns: async () => [],
  healthCheck: async () => {
    await new Promise(r => setTimeout(r, 200));
    return { ok: true, message: 'Flipkart API v3 connected. Token valid for 23h.' };
  },
};

// ---- Myntra Mock ----
const myntraMock: ChannelConnectorV2 = {
  id: 'myntra',
  name: 'Myntra',
  icon: 'Shirt',
  color: 'bg-pink-500/10 text-pink-600',
  description: 'Myntra partner marketplace',
  credentialFields: [
    { key: 'partner_id', label: 'Partner ID', type: 'text', placeholder: 'MYN-xxx' },
    { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'myn_secret_xxx' },
  ],
  pullOrders: async () => {
    await new Promise(r => setTimeout(r, 700));
    return [];
  },
  pushInventory: async (_creds, items) => {
    await new Promise(r => setTimeout(r, 400));
    return { success: items.length, failed: 0 };
  },
  updateOrderStatus: async () => true,
  pullReturns: async () => [],
  healthCheck: async () => ({ ok: false, message: 'Token expired. Re-authenticate required.' }),
};

// ---- CSV Import (special connector) ----
const csvImportConnector: ChannelConnectorV2 = {
  id: 'csv_import',
  name: 'CSV Import',
  icon: 'FileSpreadsheet',
  color: 'bg-violet-500/10 text-violet-600',
  description: 'Bulk import orders via CSV upload',
  credentialFields: [],
  pullOrders: async () => [],
  pushInventory: async () => ({ success: 0, failed: 0 }),
  updateOrderStatus: async () => true,
  pullReturns: async () => [],
  healthCheck: async () => ({ ok: true, message: 'CSV import ready. No credentials needed.' }),
};

// Registry
export const channelConnectors: ChannelConnectorV2[] = [
  clozzetMock,
  amazonMock,
  flipkartMock,
  myntraMock,
  csvImportConnector,
];

export function getConnector(id: string): ChannelConnectorV2 | undefined {
  return channelConnectors.find(c => c.id === id);
}

// Re-export CSV parser
export { parseCSVOrders };
