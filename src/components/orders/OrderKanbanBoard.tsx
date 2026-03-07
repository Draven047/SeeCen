import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
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

interface OrderKanbanBoardProps {
  orders: Order[];
  onRefresh: () => void;
}

const KANBAN_COLUMNS = [
  { key: 'new_orders', title: 'New Orders', statuses: ['new', 'unfulfilled'] },
  { key: 'accepted', title: 'Accepted', statuses: ['accepted'] },
  { key: 'picking', title: 'Picking', statuses: ['picking'] },
  { key: 'packed', title: 'Packed', statuses: ['packed'] },
  { key: 'pickup_pending', title: 'Pickup Pending', statuses: ['ready'] },
  { key: 'pickup_scheduled', title: 'Pickup Scheduled', statuses: ['pickup_scheduled', 'handover'] },
  { key: 'out_for_delivery', title: 'Out For Delivery', statuses: ['in_transit'] },
  { key: 'delivered', title: 'Delivered', statuses: ['delivered', 'fulfilled'] },
  { key: 'issues', title: 'Issues / Returns', statuses: ['declined', 'cancelled', 'failed_delivery', 'rto', 'returned', 'partial_fulfilled', 'partially_fulfilled'] },
];

const COLUMN_TO_STATUS: Record<string, string> = {
  new_orders: 'new',
  accepted: 'accepted',
  picking: 'picking',
  packed: 'packed',
  pickup_pending: 'ready',
  pickup_scheduled: 'pickup_scheduled',
  out_for_delivery: 'in_transit',
  delivered: 'delivered',
};

const ORDERED_KEYS = ['new_orders', 'accepted', 'picking', 'packed', 'pickup_pending', 'pickup_scheduled', 'out_for_delivery', 'delivered'];

function isValidTransition(sourceColumn: string, targetColumn: string): boolean {
  const srcIdx = ORDERED_KEYS.indexOf(sourceColumn);
  const tgtIdx = ORDERED_KEYS.indexOf(targetColumn);
  if (srcIdx === -1 || tgtIdx === -1) return false;
  return tgtIdx === srcIdx + 1;
}

export function OrderKanbanBoard({ orders, onRefresh }: OrderKanbanBoardProps) {
  const navigate = useNavigate();

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ fulfillment_status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success(`Order moved to ${newStatus.replace(/_/g, ' ')}`);
      onRefresh();
    }
  };

  const handleDrop = (orderId: string, targetColumn: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const sourceCol = KANBAN_COLUMNS.find(c => c.statuses.includes(order.fulfillment_status));
    if (!sourceCol) return;

    if (!isValidTransition(sourceCol.key, targetColumn)) {
      toast.error('Invalid move — orders can only advance one stage at a time');
      return;
    }

    const newStatus = COLUMN_TO_STATUS[targetColumn];
    if (newStatus) updateStatus(orderId, newStatus);
  };

  const handleAction = (orderId: string, newStatus: string) => {
    updateStatus(orderId, newStatus);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollSnapType: 'x mandatory' }}>
      {KANBAN_COLUMNS.map(col => {
        const colOrders = orders.filter(o => col.statuses.includes(o.fulfillment_status));
        return (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            title={col.title}
            orders={colOrders}
            onAction={handleAction}
            onClick={(id) => navigate(`/orders/${id}`)}
            onDrop={handleDrop}
            isDropDisabled={col.key === 'issues'}
          />
        );
      })}
    </div>
  );
}
