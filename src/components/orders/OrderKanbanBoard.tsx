import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
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

// Maps column key → the fulfillment_status to set when dropping into it
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

// Ordered columns for transition validation (index-based adjacency)
const ORDERED_KEYS = ['new_orders', 'accepted', 'picking', 'packed', 'pickup_pending', 'pickup_scheduled', 'out_for_delivery', 'delivered'];

function isValidTransition(sourceColumn: string, targetColumn: string): boolean {
  const srcIdx = ORDERED_KEYS.indexOf(sourceColumn);
  const tgtIdx = ORDERED_KEYS.indexOf(targetColumn);
  if (srcIdx === -1 || tgtIdx === -1) return false;
  // Allow only forward moves by one step
  return tgtIdx === srcIdx + 1;
}

export function OrderKanbanBoard({ orders, onRefresh }: OrderKanbanBoardProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.external_channel_order_number?.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
    const matchPayment = paymentFilter === 'all' || o.payment_type === paymentFilter;
    return matchSearch && matchChannel && matchPayment;
  });

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
    // Find source column
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
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="in_store">In-Store</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="cod">COD</SelectItem>
            <SelectItem value="prepaid">Prepaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollSnapType: 'x mandatory' }}>
        {KANBAN_COLUMNS.map(col => {
          const colOrders = filtered.filter(o => col.statuses.includes(o.fulfillment_status));
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
    </div>
  );
}
