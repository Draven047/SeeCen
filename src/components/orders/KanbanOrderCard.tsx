import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Store, Globe, Instagram, MessageCircle, ShoppingCart, FileSpreadsheet, Package, ChevronRight, Check, X } from 'lucide-react';
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

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number; locked: boolean | null }>({ startX: 0, startY: 0, locked: null });

  const hasSwipeActions = actions.length > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasSwipeActions) return;
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: null };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasSwipeActions) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    // Determine axis lock on first significant movement
    if (touchRef.current.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy); // true = horizontal
    }

    if (!touchRef.current.locked) return;

    setIsSwiping(true);
    setSwipeX(dx);
  };

  const handleTouchEnd = () => {
    if (!hasSwipeActions || !isSwiping) {
      setSwipeX(0);
      setIsSwiping(false);
      return;
    }

    const threshold = 80;

    if (swipeX > threshold) {
      // Swipe right → primary action (Accept or column primary)
      const primary = actions[0];
      if (primary) {
        onAction(order.id, primary.nextStatus);
      }
    } else if (swipeX < -threshold && columnKey === 'new_orders') {
      // Swipe left → Reject (only for new_orders)
      onAction(order.id, 'declined');
    }

    setSwipeX(0);
    setIsSwiping(false);
    touchRef.current.locked = null;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('orderId', order.id);
    e.dataTransfer.setData('sourceColumn', columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Determine swipe reveal colors
  const swipeRightColor = 'bg-emerald-500';
  const swipeLeftColor = 'bg-destructive';
  const showRightReveal = swipeX > 20;
  const showLeftReveal = swipeX < -20;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background reveals */}
      {hasSwipeActions && (
        <>
          {/* Right swipe = Accept (green) */}
          <div className={cn(
            'absolute inset-0 flex items-center justify-start pl-5 rounded-xl transition-opacity',
            swipeRightColor,
            showRightReveal ? 'opacity-100' : 'opacity-0'
          )}>
            <Check className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-sm ml-2">{actions[0]?.label}</span>
          </div>
          {/* Left swipe = Reject (red, only new_orders) */}
          {columnKey === 'new_orders' && (
            <div className={cn(
              'absolute inset-0 flex items-center justify-end pr-5 rounded-xl transition-opacity',
              swipeLeftColor,
              showLeftReveal ? 'opacity-100' : 'opacity-0'
            )}>
              <span className="text-white font-semibold text-sm mr-2">Reject</span>
              <X className="w-6 h-6 text-white" />
            </div>
          )}
        </>
      )}

      <div
        draggable={!isSwiping}
        onDragStart={handleDragStart}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (!isSwiping) onClick(order.id); }}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
        }}
        className={cn(
          'bg-card border rounded-xl p-4 cursor-pointer hover:shadow-md active:scale-[0.98] transition-shadow select-none min-h-[44px] relative z-10',
          sla.urgent && 'border-l-4 border-l-destructive'
        )}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm truncate">
              {order.external_channel_order_number || order.order_number}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium shrink-0',
              chCfg.color
            )}>
              <ChIcon className="w-3 h-3" /> {chCfg.label}
            </span>
          </div>
          {sla.label !== 'No SLA' && (
            <span className={cn('text-xs font-semibold flex items-center gap-1 shrink-0', sla.color)}>
              {sla.urgent && <Clock className="w-3.5 h-3.5" />}
              {sla.label}
            </span>
          )}
        </div>

        {/* Customer row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground truncate">
            {order.customers?.name || 'Walk-in'}
          </p>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </div>

        {/* Amount + Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold">{formatCurrency(Number(order.total))}</span>
            <span className="text-xs text-muted-foreground">{order.items_count} items</span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs px-2 py-0.5',
              isCod ? 'border-orange-400 text-orange-600' : 'border-emerald-400 text-emerald-600'
            )}
          >
            {isCod ? 'COD' : 'Prepaid'}
          </Badge>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            {actions.map(a => (
              <Button
                key={a.nextStatus}
                size="default"
                className="h-11 text-sm flex-1 font-semibold"
                onClick={(e) => { e.stopPropagation(); onAction(order.id, a.nextStatus); }}
              >
                {a.label}
              </Button>
            ))}
            {columnKey === 'new_orders' && (
              <Button
                variant="destructive"
                size="default"
                className="h-11 text-sm font-semibold"
                onClick={(e) => { e.stopPropagation(); onAction(order.id, 'declined'); }}
              >
                Reject
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
