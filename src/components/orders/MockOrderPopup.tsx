import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingBag, Clock, User, CreditCard, X, Check } from 'lucide-react';

const MOCK_ORDER_KEY = 'seecen_mock_order_enabled';
const INTERVAL_MS = 60_000;
const COUNTDOWN_SECS = 120;

const CUSTOMERS = ['Rahul Sharma', 'Priya Patel', 'Arjun Mehta', 'Sneha Gupta', 'Vikram Singh', 'Ananya Reddy'];
const ITEMS = [
  ['Cohiba Behike 56', 'Montecristo No. 2'],
  ['Partagas Serie D No. 4'],
  ['Romeo y Julieta Churchill', 'H. Upmann Magnum 50', 'Bolivar Royal Corona'],
  ['Trinidad Fundadores'],
  ['Arturo Fuente OpusX', 'Padron 1964'],
];
const CHANNELS = ['Walk-in', 'WhatsApp', 'Instagram', 'Phone'];
const PAYMENT_TYPES = ['UPI', 'Cash', 'Card'];
const PREP_OPTIONS = [15, 30, 45, 60];

function generateMockOrder() {
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const items = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const payment = PAYMENT_TYPES[Math.floor(Math.random() * PAYMENT_TYPES.length)];
  const amount = Math.floor(Math.random() * 15000) + 2000;
  const orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return { orderId, customer, items, channel, payment, amount };
}

export function MockOrderPopup() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(MOCK_ORDER_KEY) === 'true');
  const [order, setOrder] = useState<ReturnType<typeof generateMockOrder> | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [prepTime, setPrepTime] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for localStorage changes from Settings
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === MOCK_ORDER_KEY) {
        setEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    // Also poll in case same-tab dispatch
    const poll = setInterval(() => {
      setEnabled(localStorage.getItem(MOCK_ORDER_KEY) === 'true');
    }, 2000);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(poll);
    };
  }, []);

  const showOrder = useCallback(() => {
    setOrder(generateMockOrder());
    setCountdown(COUNTDOWN_SECS);
    setPrepTime(30);
  }, []);

  // Main 60s interval
  useEffect(() => {
    if (enabled) {
      // Show first one after 5s for quick feedback
      const timeout = setTimeout(showOrder, 5000);
      intervalRef.current = setInterval(showOrder, INTERVAL_MS);
      return () => {
        clearTimeout(timeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setOrder(null);
    }
  }, [enabled, showOrder]);

  // Countdown timer
  useEffect(() => {
    if (order) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setOrder(null);
            toast.error('Mock order expired — not accepted in time');
            return COUNTDOWN_SECS;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [order]);

  const handleAccept = () => {
    toast.success(`Order ${order?.orderId} accepted — Prep time: ${prepTime}m`);
    setOrder(null);
  };

  const handleReject = () => {
    toast.info(`Order ${order?.orderId} rejected`);
    setOrder(null);
  };

  if (!order) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) setOrder(null); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-primary/20">
        {/* Header */}
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-bold text-lg">New Order</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold text-lg">
                {mins}:{String(secs).padStart(2, '0')}
              </span>
            </div>
          </div>
          <p className="text-primary-foreground/70 text-xs mt-1">Accept within the countdown</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Order ID & Channel */}
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-foreground">{order.orderId}</span>
            <Badge variant="secondary">{order.channel}</Badge>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{order.customer}</span>
          </div>

          {/* Items */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="text-sm text-foreground flex justify-between">
                <span>{item}</span>
                <span className="text-muted-foreground">×1</span>
              </div>
            ))}
          </div>

          {/* Amount & Payment */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">₹{order.amount.toLocaleString('en-IN')}</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>{order.payment}</span>
            </div>
          </div>

          {/* Prep Time */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prep Time</span>
            <div className="flex gap-2">
              {PREP_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setPrepTime(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prepTime === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t >= 60 ? `${t / 60}h` : `${t}m`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleReject}>
            <X className="w-4 h-4" /> Reject
          </Button>
          <Button className="flex-1 gap-2" onClick={handleAccept}>
            <Check className="w-4 h-4" /> Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
