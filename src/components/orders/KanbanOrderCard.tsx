import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Store, Globe, Instagram, MessageCircle, ShoppingCart, FileSpreadsheet, Package } from 'lucide-react';
import { CHANNEL_CONFIG, getSlaStatus, type SalesChannel } from '@/lib/channelConnectors';

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_store: Store, website: Globe, instagram: Instagram,
  whatsapp: MessageCircle, marketplace: ShoppingCart, csv_import: FileSpreadsheet,
};

interface KanbanOrderCardProps {
  order: {
    id: string;
    order_number: string;
    external_channel_order_number: string | null;
    channel: SalesChannel;
    total: number;
    items_count: number;
    payment_type: string;
    sla_deadline: string | null;
    fulfillment_status: string;
    customers: { name: string } | null;
  };
  columnKey: string;
  onAction: (orderId: string, newStatus: string) => void;
  onClick: (orderId: string) => void;
}

const COLUMN_ACTIONS: Record<string, { label: string; nextStatus: string }[]> = {
  new_orders: [{ label: 'Accept', nextStatus: 'accepted' }],
  accepted: [{ label: 'Start Picking', nextStatus: 'picking' }],
  picking: [{ label: 'Move to Packing', nextStatus: 'packed' }],
  packed: [{ label: 'Ready for Pickup', nextStatus: 'ready' }],
  pickup_pending: [{ label: 'Schedule Courier', nextStatus: 'pickup_scheduled' }],
  pickup_scheduled: [{ label: 'Mark Picked Up', nextStatus: 'in_transit' }],
  out_for_delivery: [{ label: 'Mark Delivered', nextStatus: 'delivered' }],
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export function KanbanOrderCard({ order, columnKey, onAction, onClick }: KanbanOrderCardProps) {
  const chCfg = CHANNEL_CONFIG[order.channel] || CHANNEL_CONFIG.in_store;
  const ChIcon = CHANNEL_ICONS[order.channel] || Package;
  const sla = getSlaStatus(order.sla_deadline);
  const actions = COLUMN_ACTIONS[columnKey] || [];
  const isCod = order.payment_type === 'cod';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('orderId', order.id);
    e.dataTransfer.setData('sourceColumn', columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick(order.id)}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow select-none',
        sla.urgent && 'border-l-4 border-l-destructive'
      )}
    >
      {/* Top: Order ID + Channel */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-xs truncate">
          {order.external_channel_order_number || order.order_number}
        </span>
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0', chCfg.color)}>
          <ChIcon className="w-2.5 h-2.5" /> {chCfg.label}
        </span>
      </div>

      {/* Middle: Customer, Total, Items */}
      <p className="text-xs text-muted-foreground truncate">{order.customers?.name || 'Walk-in'}</p>
      <p className="text-sm font-semibold mt-1">
        {formatCurrency(Number(order.total))} <span className="text-muted-foreground font-normal text-xs">• {order.items_count} items</span>
      </p>

      {/* Bottom: Payment + SLA */}
      <div className="flex items-center justify-between mt-2">
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5', isCod ? 'border-orange-400 text-orange-600' : 'border-emerald-400 text-emerald-600')}
        >
          {isCod ? 'COD' : 'Prepaid'}
        </Badge>
        {sla.label !== 'No SLA' && (
          <span className={cn('text-[10px] font-medium flex items-center gap-0.5', sla.color)}>
            {sla.urgent && <Clock className="w-2.5 h-2.5" />}
            {sla.label}
          </span>
        )}
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
          {actions.map(a => (
            <Button
              key={a.nextStatus}
              size="sm"
              className="h-7 text-[11px] flex-1"
              onClick={(e) => { e.stopPropagation(); onAction(order.id, a.nextStatus); }}
            >
              {a.label}
            </Button>
          ))}
          {columnKey === 'new_orders' && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-[11px]"
              onClick={(e) => { e.stopPropagation(); onAction(order.id, 'declined'); }}
            >
              Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
