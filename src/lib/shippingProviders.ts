// Shipping Provider Interface & Mock Implementations

export interface ShippingQuote {
  provider: string;
  serviceType: string;
  estimatedDeliveryHours: number;
  cost: number;
  currency: string;
}

export interface PickupRequest {
  orderId: string;
  storeId: string;
  pickupAddress: string;
  pickupScheduledAt: string;
  serviceType: string;
  packageWeight?: number;
  packageDimensions?: string;
}

export interface PickupResult {
  trackingId: string;
  awbNumber: string;
  estimatedDeliveryAt: string;
  riderName?: string;
  riderPhone?: string;
  labelUrl?: string;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

export interface ShippingProvider {
  id: string;
  name: string;
  icon: string;
  getQuote: (originPincode: string, destPincode: string, weightGrams: number) => Promise<ShippingQuote[]>;
  createPickup: (request: PickupRequest) => Promise<PickupResult>;
  cancelPickup: (trackingId: string) => Promise<boolean>;
  trackShipment: (trackingId: string) => Promise<TrackingEvent[]>;
  webhookHandler?: (payload: unknown) => Promise<void>;
}

// Shipment status flow
export const SHIPMENT_STATUSES: Record<string, { label: string; color: string; step: number }> = {
  pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-cyan-500/10 text-cyan-600', step: 0 },
  rider_assigned: { label: 'Rider Assigned', color: 'bg-indigo-500/10 text-indigo-600', step: 1 },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500/10 text-blue-600', step: 2 },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/10 text-purple-600', step: 3 },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-amber-500/10 text-amber-600', step: 4 },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600', step: 5 },
  failed: { label: 'Failed Pickup', color: 'bg-red-500/10 text-red-600', step: -1 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-600', step: -1 },
  rto: { label: 'RTO', color: 'bg-rose-500/10 text-rose-600', step: -1 },
};

export const SHIPMENT_TIMELINE = [
  { key: 'pickup_scheduled', label: 'Scheduled' },
  { key: 'rider_assigned', label: 'Rider Assigned' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

// ---- Porter (Mock) Provider ----
function generateTrackingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PTR';
  for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export const porterMockProvider: ShippingProvider = {
  id: 'porter_mock',
  name: 'Porter (Mock)',
  icon: 'Truck',

  getQuote: async (_originPincode, _destPincode, weightGrams) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 400));
    const baseRate = 50 + (weightGrams / 1000) * 20;
    return [
      { provider: 'Porter (Mock)', serviceType: 'standard', estimatedDeliveryHours: 48, cost: Math.round(baseRate), currency: 'INR' },
      { provider: 'Porter (Mock)', serviceType: 'express', estimatedDeliveryHours: 24, cost: Math.round(baseRate * 1.6), currency: 'INR' },
      { provider: 'Porter (Mock)', serviceType: 'same_day', estimatedDeliveryHours: 6, cost: Math.round(baseRate * 2.5), currency: 'INR' },
    ];
  },

  createPickup: async (request) => {
    await new Promise(r => setTimeout(r, 600));
    const trackingId = generateTrackingId();
    const hours = request.serviceType === 'same_day' ? 6 : request.serviceType === 'express' ? 24 : 48;
    const estimatedDelivery = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    return {
      trackingId,
      awbNumber: `AWB${trackingId}`,
      estimatedDeliveryAt: estimatedDelivery,
      riderName: 'Raj Kumar (Mock)',
      riderPhone: '+91 98765 43210',
      labelUrl: undefined,
    };
  },

  cancelPickup: async (_trackingId) => {
    await new Promise(r => setTimeout(r, 300));
    return true;
  },

  trackShipment: async (trackingId) => {
    await new Promise(r => setTimeout(r, 300));
    const now = Date.now();
    return [
      { status: 'pickup_scheduled', description: 'Pickup has been scheduled', location: 'Store', timestamp: new Date(now - 4 * 3600000).toISOString() },
      { status: 'rider_assigned', description: `Rider assigned for pickup. Tracking: ${trackingId}`, location: 'Hub', timestamp: new Date(now - 3 * 3600000).toISOString() },
    ];
  },
};

// Registry of all providers
export const shippingProviders: ShippingProvider[] = [porterMockProvider];

export function getProvider(id: string): ShippingProvider | undefined {
  return shippingProviders.find(p => p.id === id);
}
