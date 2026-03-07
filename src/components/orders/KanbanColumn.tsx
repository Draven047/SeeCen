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
        'flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-lg border bg-muted/30 snap-start',
        dragOver && !isDropDisabled && 'ring-2 ring-primary/50 bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h3 className="text-xs font-semibold">{title}</h3>
        <span className="bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
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
          <p className="text-xs text-muted-foreground text-center py-8">No orders</p>
        )}
        {hasMore && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAll(true)}>
            Show {orders.length - PAGE_SIZE} more
          </Button>
        )}
      </div>
    </div>
  );
}
