import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, IndianRupee, Loader2, CheckCircle } from 'lucide-react';
import { shippingProviders, type ShippingQuote } from '@/lib/shippingProviders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DispatchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  storeId: string | null;
  storeAddress?: string;
  onSuccess?: () => void;
}

export function DispatchDrawer({ open, onOpenChange, orderId, storeId, storeAddress, onSuccess }: DispatchDrawerProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'provider' | 'quote' | 'schedule' | 'confirm'>('provider');
  const [selectedProvider, setSelectedProvider] = useState(shippingProviders[0]?.id || '');
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuote | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState(storeAddress || '');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  const fetchQuotes = async () => {
    setLoading(true);
    const provider = shippingProviders.find(p => p.id === selectedProvider);
    if (!provider) { toast.error('Provider not found'); setLoading(false); return; }
    try {
      const results = await provider.getQuote('400001', '110001', 500);
      setQuotes(results);
      setStep('quote');
    } catch { toast.error('Failed to fetch quotes'); }
    setLoading(false);
  };

  const confirmBooking = async () => {
    if (!selectedQuote || !user) return;
    setLoading(true);
    const provider = shippingProviders.find(p => p.id === selectedProvider);
    if (!provider) { setLoading(false); return; }

    try {
      const scheduledAt = pickupDate && pickupTime
        ? new Date(`${pickupDate}T${pickupTime}`).toISOString()
        : new Date(Date.now() + 2 * 3600000).toISOString();

      const result = await provider.createPickup({
        orderId, storeId: storeId || '', pickupAddress,
        pickupScheduledAt: scheduledAt, serviceType: selectedQuote.serviceType,
      });

      // Save to DB
      const { error } = await supabase.from('shipments').insert({
        order_id: orderId,
        store_id: storeId,
        provider_name: selectedProvider,
        tracking_id: result.trackingId,
        status: 'pickup_scheduled',
        pickup_address: pickupAddress,
        pickup_scheduled_at: scheduledAt,
        estimated_delivery_at: result.estimatedDeliveryAt,
        quote_amount: selectedQuote.cost,
        service_type: selectedQuote.serviceType,
        rider_name: result.riderName,
        rider_phone: result.riderPhone,
        awb_number: result.awbNumber,
        label_url: result.labelUrl,
        created_by: user.id,
      });
      if (error) throw error;

      // Insert initial tracking event
      const { data: shipment } = await supabase.from('shipments').select('id').eq('tracking_id', result.trackingId).single();
      if (shipment) {
        await supabase.from('shipment_tracking_events').insert({
          shipment_id: shipment.id,
          status: 'pickup_scheduled',
          description: `Pickup scheduled via ${provider.name}. AWB: ${result.awbNumber}`,
        });
      }

      // Update order fulfillment status
      await supabase.from('orders').update({
        fulfillment_status: 'pickup_scheduled',
        shipped_at: new Date().toISOString(),
      }).eq('id', orderId);

      setTrackingId(result.trackingId);
      setConfirmed(true);
      setStep('confirm');
      toast.success(`Pickup booked! Tracking: ${result.trackingId}`);
      onSuccess?.();
    } catch (e: any) { toast.error(e.message || 'Booking failed'); }
    setLoading(false);
  };

  const reset = () => {
    setStep('provider');
    setQuotes([]);
    setSelectedQuote(null);
    setPickupDate('');
    setPickupTime('');
    setConfirmed(false);
    setTrackingId('');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Book Pickup</SheetTitle>
          <SheetDescription>Schedule a courier pickup for this order</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Step 1: Provider */}
          {step === 'provider' && (
            <div className="space-y-4">
              <Label>Shipping Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shippingProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label>Pickup Address</Label>
                <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Store address" />
              </div>
              <Button onClick={fetchQuotes} disabled={loading || !selectedProvider} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Get Quotes
              </Button>
            </div>
          )}

          {/* Step 2: Quote Selection */}
          {step === 'quote' && (
            <div className="space-y-4">
              <Label>Select Service</Label>
              <div className="space-y-2">
                {quotes.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedQuote(q); setStep('schedule'); }}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors hover:border-primary/50',
                      selectedQuote?.serviceType === q.serviceType ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{q.serviceType.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Est. {q.estimatedDeliveryHours}h
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />{q.cost}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setStep('provider')} className="w-full">Back</Button>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium capitalize">{selectedQuote?.serviceType.replace('_', ' ')}</p>
                <p className="text-sm text-muted-foreground">₹{selectedQuote?.cost} • Est. {selectedQuote?.estimatedDeliveryHours}h</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pickup Date</Label>
                  <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label>Pickup Time</Label>
                  <Input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
                </div>
              </div>
              <Button onClick={confirmBooking} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Booking
              </Button>
              <Button variant="outline" onClick={() => setStep('quote')} className="w-full">Back</Button>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && confirmed && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Pickup Booked!</p>
                <p className="text-sm text-muted-foreground mt-1">Tracking ID</p>
                <p className="font-mono text-lg font-bold text-primary">{trackingId}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-left space-y-1">
                <p><span className="text-muted-foreground">Provider:</span> {shippingProviders.find(p => p.id === selectedProvider)?.name}</p>
                <p><span className="text-muted-foreground">Service:</span> <span className="capitalize">{selectedQuote?.serviceType.replace('_', ' ')}</span></p>
                <p><span className="text-muted-foreground">Cost:</span> ₹{selectedQuote?.cost}</p>
              </div>
              <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
