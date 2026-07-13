// Heuristic RTO (return-to-origin) risk for orders that haven't shipped yet.
// Mirrors the signals courier aggregators weigh: COD exposure, ticket size,
// address quality, and channel behaviour.

export interface RtoRiskInput {
  payment_type?: string | null;
  total?: number | string | null;
  shipping_address?: string | null;
  channel?: string | null;
  fulfillment_type?: string | null;
}

export interface RtoRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
}

export function rtoRisk(order: RtoRiskInput): RtoRisk {
  // Pickup / counter sales can't RTO.
  if (order.fulfillment_type === 'pickup' || order.channel === 'in_store' || order.channel === 'walk_in') {
    return { score: 0, level: 'low', reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  if (order.payment_type === 'cod') {
    score += 40;
    reasons.push('COD payment — no upfront commitment');
  }
  if (Number(order.total || 0) >= 5000) {
    score += 20;
    reasons.push('High ticket value');
  }
  const address = (order.shipping_address || '').trim();
  if (address.length < 20) {
    score += 25;
    reasons.push(address ? 'Short / possibly incomplete address' : 'No shipping address on file');
  }
  if (order.channel === 'instagram' || order.channel === 'ondc') {
    score += 15;
    reasons.push('Impulse-prone channel');
  }

  const level = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { score, level, reasons };
}
