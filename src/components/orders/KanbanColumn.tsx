import { useState } from 'react';
import { cn } from '@/lib/utils';
import { KanbanOrderCard } from './KanbanOrderCard';
import { Button } from '@/components/ui/button';
import type { SalesChannel } from '@/lib/channelConnectors';

interface Order {
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
}

interface KanbanColumnProps {
  columnKey: string;
  title: string;
  orders: Order[];
  onAction: (orderId: string, newStatus: string) => void;
  onClick: (orderId: string) => void;
  onDrop: (orderId: string, targetColumn: string) => void;
  isDropDisabled?: boolean;
}

const PAGE_SIZE = 20;

const COLUMN_ACCENT: Record<string, string> = {
  new_orders: 'border-t-primary',
  accepted: 'border-t-blue-500',
  picking: 'border-t-amber-500',
  packed: 'border-t-violet-500',
  pickup_pending: 'border-t-orange-500',
  pickup_scheduled: 'border-t-cyan-500',
  out_for_delivery: 'border-t-indigo-500',
  delivered: 'border-t-emerald-500',
  issues: 'border-t-destructive',
};

export function KanbanColumn({ columnKey, title, orders, onAction, onClick, onDrop, isDropDisabled }: KanbanColumnProps) {
  const [showAll, setShowAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const visible = showAll ? orders : orders.slice(0, PAGE_SIZE);
  const hasMore = orders.length > PAGE_SIZE && !showAll;

  const handleDragOver = (e: React.DragEvent) => {
    if (isDropDisabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isDropDisabled) return;
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) onDrop(orderId, columnKey);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-w-[300px] w-[300px] shrink-0 rounded-xl border border-t-4 bg-muted/20 snap-start',
        COLUMN_ACCENT[columnKey] || 'border-t-muted-foreground',
        dragOver && !isDropDisabled && 'ring-2 ring-primary/50 bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center',
          orders.length > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {orders.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {visible.map(order => (
          <KanbanOrderCard
            key={order.id}
            order={order}
            columnKey={columnKey}
            onAction={onAction}
            onClick={onClick}
          />
        ))}
        {orders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No orders</p>
        )}
        {hasMore && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-10" onClick={() => setShowAll(true)}>
            Show {orders.length - PAGE_SIZE} more
          </Button>
        )}
      </div>
    </div>
  );
}
