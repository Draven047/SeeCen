import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PackageCheck, Truck, Search, RefreshCw, MapPin, Clock, Phone, User, X, RotateCcw, CheckCircle, Circle, Loader2 } from 'lucide-react';
import { SHIPMENT_STATUSES, SHIPMENT_TIMELINE, shippingProviders, getProvider } from '@/lib/shippingProviders';
import { DispatchDrawer } from '@/components/shipping/DispatchDrawer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  order_id: string;
  store_id: string | null;
  provider_name: string;
  tracking_id: string;
  status: string;
  pickup_address: string | null;
  pickup_scheduled_at: string | null;
  estimated_delivery_at: string | null;
  quote_amount: number;
  service_type: string;
  rider_name: string | null;
  rider_phone: string | null;
  awb_number: string | null;
  created_at: string;
  order?: { order_number: string; customer?: { name: string } | null } | null;
}

interface TrackingEvent {
  id: string;
  status: string;
  description: string | null;
  location: string | null;
  timestamp: string;
}

export default function Shipping() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const selectedStore = currentStore?.id || null;
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showCreatePickup, setShowCreatePickup] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // For "Create Pickup" from this page, we need an order selector
  const [pendingOrders, setPendingOrders] = useState<{ id: string; order_number: string; store_id: string | null; store?: { name: string; address: string | null } | null }[]>([]);
  const [selectedOrderForPickup, setSelectedOrderForPickup] = useState<string | null>(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  useEffect(() => { fetchShipments(); fetchPendingOrders(); }, [selectedStore]);

  const fetchShipments = async () => {
    setLoading(true);
    let query = supabase.from('shipments').select('*, order:orders(order_number, customer:customers(name))').order('created_at', { ascending: false });
    if (selectedStore) query = query.eq('store_id', selectedStore);
    const { data } = await query;
    setShipments((data as unknown as Shipment[]) || []);
    setLoading(false);
  };

  const fetchPendingOrders = async () => {
    let query = supabase.from('orders').select('id, order_number, store_id, store:stores(name, address)')
      .in('fulfillment_status', ['packed', 'ready'])
      .eq('fulfillment_type', 'self_ship');
    if (selectedStore) query = query.eq('store_id', selectedStore);
    const { data } = await query;
    setPendingOrders((data as any) || []);
  };

  const openTracking = async (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setTrackingLoading(true);
    const { data } = await supabase.from('shipment_tracking_events').select('*').eq('shipment_id', shipment.id).order('timestamp', { ascending: true });
    setTrackingEvents((data as TrackingEvent[]) || []);
    setTrackingLoading(false);
  };

  const handleCancelPickup = async (shipment: Shipment) => {
    setActionLoading(true);
    const provider = getProvider(shipment.provider_name);
    if (!provider) { toast.error('Provider not found'); setActionLoading(false); return; }
    try {
      await provider.cancelPickup(shipment.tracking_id);
      await supabase.from('shipments').update({ status: 'cancelled' }).eq('id', shipment.id);
      await supabase.from('shipment_tracking_events').insert({
        shipment_id: shipment.id, status: 'cancelled', description: 'Pickup cancelled by user',
      });
      toast.success('Pickup cancelled');
      fetchShipments();
      if (selectedShipment?.id === shipment.id) openTracking({ ...shipment, status: 'cancelled' });
    } catch { toast.error('Failed to cancel'); }
    setActionLoading(false);
  };

  const simulateAdvance = async (shipment: Shipment) => {
    setActionLoading(true);
    const flow = ['pickup_scheduled', 'rider_assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
    const idx = flow.indexOf(shipment.status);
    if (idx < 0 || idx >= flow.length - 1) { toast.error('Cannot advance'); setActionLoading(false); return; }
    const next = flow[idx + 1];
    const descriptions: Record<string, string> = {
      rider_assigned: 'Rider has been assigned for pickup',
      picked_up: 'Package picked up from store',
      in_transit: 'Package is in transit to destination',
      out_for_delivery: 'Package is out for delivery',
      delivered: 'Package delivered successfully',
    };
    await supabase.from('shipments').update({ status: next }).eq('id', shipment.id);
    await supabase.from('shipment_tracking_events').insert({
      shipment_id: shipment.id, status: next, description: descriptions[next] || `Status changed to ${next}`,
    });
    if (next === 'delivered') {
      await supabase.from('orders').update({ fulfillment_status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', shipment.order_id);
    } else if (next === 'in_transit') {
      await supabase.from('orders').update({ fulfillment_status: 'in_transit' }).eq('id', shipment.order_id);
    }
    toast.success(`Advanced to ${SHIPMENT_STATUSES[next]?.label || next}`);
    fetchShipments();
    if (selectedShipment?.id === shipment.id) openTracking({ ...shipment, status: next });
    setActionLoading(false);
  };

  const filtered = shipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.tracking_id.toLowerCase().includes(q) || s.order?.order_number?.toLowerCase().includes(q) || s.order?.customer?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeShipments = shipments.filter(s => !['delivered', 'cancelled', 'rto'].includes(s.status));
  const completedShipments = shipments.filter(s => ['delivered', 'cancelled', 'rto'].includes(s.status));

  const currentStep = selectedShipment ? (SHIPMENT_STATUSES[selectedShipment.status]?.step ?? 0) : 0;
  const isEdgeState = selectedShipment ? ['failed', 'cancelled', 'rto'].includes(selectedShipment.status) : false;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-display">Shipping & Pickups</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage courier pickups, track shipments, and handle deliveries</p>
          </div>
          <Button onClick={() => setShowOrderPicker(true)}>
            <Truck className="w-4 h-4 mr-2" /> Create Pickup
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Shipments', value: activeShipments.length, color: 'text-primary' },
            { label: 'In Transit', value: shipments.filter(s => s.status === 'in_transit').length, color: 'text-purple-600' },
            { label: 'Delivered', value: shipments.filter(s => s.status === 'delivered').length, color: 'text-emerald-600' },
            { label: 'Pending Pickup', value: pendingOrders.length, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search tracking ID, order..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(SHIPMENT_STATUSES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchShipments}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {/* Table */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeShipments.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedShipments.length})</TabsTrigger>
          </TabsList>

          {['active', 'completed'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking ID</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tab === 'active' ? activeShipments : completedShipments)
                        .filter(s => filtered.includes(s))
                        .map(s => {
                          const cfg = SHIPMENT_STATUSES[s.status] || { label: s.status, color: 'bg-muted text-muted-foreground' };
                          return (
                            <TableRow key={s.id} className="cursor-pointer" onClick={() => openTracking(s)}>
                              <TableCell className="font-mono text-sm font-medium">{s.tracking_id}</TableCell>
                              <TableCell>
                                <p className="font-medium text-sm">{s.order?.order_number}</p>
                                <p className="text-xs text-muted-foreground">{s.order?.customer?.name}</p>
                              </TableCell>
                              <TableCell className="text-sm">{shippingProviders.find(p => p.id === s.provider_name)?.name || s.provider_name}</TableCell>
                              <TableCell className="text-sm capitalize">{s.service_type.replace('_', ' ')}</TableCell>
                              <TableCell><Badge variant="secondary" className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge></TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {s.estimated_delivery_at ? format(new Date(s.estimated_delivery_at), 'dd MMM, HH:mm') : '-'}
                              </TableCell>
                              <TableCell className="text-sm font-medium">₹{s.quote_amount}</TableCell>
                              <TableCell>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  {!['delivered', 'cancelled', 'rto'].includes(s.status) && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => simulateAdvance(s)} disabled={actionLoading} title="Simulate next status">
                                        <RefreshCw className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleCancelPickup(s)} disabled={actionLoading} title="Cancel">
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <PackageCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            No shipments found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Tracking Detail Dialog */}
      <Dialog open={!!selectedShipment} onOpenChange={open => { if (!open) setSelectedShipment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Shipment {selectedShipment?.tracking_id}
            </DialogTitle>
            <DialogDescription>Track shipment progress and manage pickup</DialogDescription>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-5">
              {/* Timeline */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {SHIPMENT_TIMELINE.map((step, i) => {
                  const stepCfg = SHIPMENT_STATUSES[step.key];
                  const isComplete = !isEdgeState && stepCfg && stepCfg.step <= currentStep;
                  const isCurrent = !isEdgeState && stepCfg && stepCfg.step === currentStep;
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px]',
                          isCurrent ? 'bg-primary text-primary-foreground' :
                          isComplete ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                        )}>
                          {isComplete && !isCurrent ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        </div>
                        <span className={cn('text-[9px] mt-1 whitespace-nowrap', isCurrent ? 'font-semibold' : 'text-muted-foreground')}>{step.label}</span>
                      </div>
                      {i < SHIPMENT_TIMELINE.length - 1 && <div className={cn('w-6 h-0.5 mt-[-12px]', isComplete ? 'bg-success' : 'bg-muted')} />}
                    </div>
                  );
                })}
              </div>

              {isEdgeState && (
                <Badge variant="destructive" className="text-xs">{SHIPMENT_STATUSES[selectedShipment.status]?.label || selectedShipment.status}</Badge>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" /><span>{shippingProviders.find(p => p.id === selectedShipment.provider_name)?.name}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="capitalize">{selectedShipment.service_type.replace('_', ' ')}</span></div>
                {selectedShipment.rider_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{selectedShipment.rider_name}</span></div>}
                {selectedShipment.rider_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{selectedShipment.rider_phone}</span></div>}
              </div>

              {/* Events */}
              <div>
                <p className="text-sm font-medium mb-2">Tracking History</p>
                {trackingLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {trackingEvents.map((ev, i) => (
                      <div key={ev.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn('w-2 h-2 rounded-full mt-1.5', i === trackingEvents.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40')} />
                          {i < trackingEvents.length - 1 && <div className="w-px h-full bg-border" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-medium">{SHIPMENT_STATUSES[ev.status]?.label || ev.status}</p>
                          {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                          <p className="text-[10px] text-muted-foreground">{format(new Date(ev.timestamp), 'dd MMM yyyy, HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                    {trackingEvents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!['delivered', 'cancelled', 'rto'].includes(selectedShipment.status) && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCancelPickup(selectedShipment)} disabled={actionLoading}>
                    <X className="w-3 h-3 mr-1" /> Cancel Pickup
                  </Button>
                  <Button size="sm" onClick={() => simulateAdvance(selectedShipment)} disabled={actionLoading}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Advance (Mock)
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Picker for Create Pickup */}
      <Dialog open={showOrderPicker} onOpenChange={setShowOrderPicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Order for Pickup</DialogTitle>
            <DialogDescription>Choose a packed/ready order to schedule a courier pickup</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingOrders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No orders ready for pickup</p>
            )}
            {pendingOrders.map(o => (
              <button
                key={o.id}
                onClick={() => { setSelectedOrderForPickup(o.id); setShowOrderPicker(false); setShowCreatePickup(true); }}
                className="w-full p-3 rounded-lg border hover:border-primary/50 text-left transition-colors"
              >
                <p className="font-medium text-sm">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{o.store?.name}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Drawer */}
      {selectedOrderForPickup && (
        <DispatchDrawer
          open={showCreatePickup}
          onOpenChange={setShowCreatePickup}
          orderId={selectedOrderForPickup}
          storeId={pendingOrders.find(o => o.id === selectedOrderForPickup)?.store_id || null}
          storeAddress={pendingOrders.find(o => o.id === selectedOrderForPickup)?.store?.address || ''}
          onSuccess={() => { fetchShipments(); fetchPendingOrders(); }}
        />
      )}
    </DashboardLayout>
  );
}
