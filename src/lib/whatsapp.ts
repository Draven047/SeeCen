import { brand, formatCurrency } from '@/config/brand';

export type OrderMessageKind = 'confirmed' | 'packed' | 'shipped' | 'ndr' | 'delivered';

export interface OrderMessageContext {
  customerName?: string | null;
  orderNumber: string;
  total?: number | null;
  trackingId?: string | null;
  storeName?: string | null;
}

export const ORDER_MESSAGE_LABELS: Record<OrderMessageKind, string> = {
  confirmed: 'Order confirmed',
  packed: 'Packed & ready',
  shipped: 'Shipped with tracking',
  ndr: 'Delivery attempt failed',
  delivered: 'Delivered — thank you',
};

export function orderMessage(kind: OrderMessageKind, ctx: OrderMessageContext): string {
  const first = (ctx.customerName || '').trim().split(' ')[0] || 'there';
  const store = ctx.storeName || brand.name;
  const amount = ctx.total != null ? formatCurrency(Number(ctx.total)) : '';

  switch (kind) {
    case 'confirmed':
      return `Hi ${first}! Your order ${ctx.orderNumber}${amount ? ` (${amount})` : ''} is confirmed at ${store}. We'll update you as soon as it's packed. Thank you for shopping with us!`;
    case 'packed':
      return `Hi ${first}! Good news — your order ${ctx.orderNumber} is packed and ready for dispatch. It will be on its way shortly.`;
    case 'shipped':
      return `Hi ${first}! Your order ${ctx.orderNumber} has shipped${ctx.trackingId ? `. Tracking ID: ${ctx.trackingId}` : ''}. We'll let you know when it's out for delivery.`;
    case 'ndr':
      return `Hi ${first}, our courier tried to deliver your order ${ctx.orderNumber} but couldn't reach you. Could you confirm your address and a good time to reattempt delivery? Reply here and we'll arrange it right away.`;
    case 'delivered':
      return `Hi ${first}! Your order ${ctx.orderNumber} has been delivered. We hope you love it — reply here if anything isn't right and we'll sort it out.`;
  }
}

/** wa.me deep link with a prefilled message. Returns null when there is no usable phone number. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
