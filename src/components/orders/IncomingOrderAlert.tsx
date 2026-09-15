import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  ShoppingBag, Clock, User, ChevronDown, ChevronUp,
  Volume2, VolumeX, Minus, Plus, MapPin, Package,
  ArrowLeft, Printer, ExternalLink, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Config ──────────────────────────────────────────────
const MOCK_ORDER_KEY = 'seecen_mock_order_enabled';
const MUTE_KEY = 'seecen_order_muted';
const INTERVAL_MS = 60_000;
const COUNTDOWN_SECS = 120;
const PACKING_MIN = 5;
const PACKING_MAX = 60;
const PACKING_STEP = 5;
const PACKING_PRESETS = [10, 15, 20, 30];

// ─── Mock data ───────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Rahul Sharma', returning: true },
  { name: 'Priya Patel', returning: false },
  { name: 'Arjun Mehta', returning: true },
  { name: 'Sneha Gupta', returning: false },
  { name: 'Vikram Singh', returning: true },
  { name: 'Ananya Reddy', returning: false },
];

const FASHION_ITEMS = [
  { name: 'Classic White Oxford Shirt', variant: 'Size M · White', price: 1899 },
  { name: 'Slim Fit Chinos', variant: 'Size 32 · Khaki', price: 2499 },
  { name: 'Denim Trucker Jacket', variant: 'Size L · Indigo', price: 4999 },
  { name: 'Linen Kurta Set', variant: 'Size XL · Sage Green', price: 3299 },
  { name: 'Cotton Polo T-Shirt', variant: 'Size S · Navy', price: 1299 },
  { name: 'Formal Blazer', variant: 'Size 40 · Charcoal', price: 7999 },
  { name: 'Printed Maxi Dress', variant: 'Size M · Floral Blue', price: 2799 },
  { name: 'Straight Fit Jeans', variant: 'Size 30 · Dark Wash', price: 2199 },
  { name: 'Embroidered Anarkali', variant: 'Size L · Maroon', price: 5499 },
  { name: 'Leather Belt', variant: 'Free Size · Brown', price: 899 },
];

const CHANNELS = ['SeeCen', 'Myntra', 'Amazon', 'WhatsApp', 'Instagram', 'Walk-in'];
const PAYMENT_TYPES: Array<{ label: string; color: string }> = [
  { label: 'Prepaid', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { label: 'COD', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
];
const DELIVERY_TYPES = ['Delivery', 'Pickup', 'Self-ship'];
const STORES = ['SeeCen Mumbai', 'SeeCen Delhi', 'SeeCen Bengaluru'];

const REJECT_REASONS = [
  'Out of stock',
  'Store busy',
  'Unable to fulfill',
  'Delivery issue',
  'Other',
];

interface OrderItem {
  name: string;
  variant: string;
  price: number;
  qty: number;
}

interface MockOrder {
  orderId: string;
  customer: { name: string; returning: boolean };
  items: OrderItem[];
  channel: string;
  payment: { label: string; color: string };
  deliveryType: string;
  store: string;
  amount: number;
  timestamp: Date;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockOrder(): MockOrder {
  const itemCount = Math.floor(Math.random() * 4) + 1;
  const selectedItems: OrderItem[] = [];
  const used = new Set<number>();
  for (let i = 0; i < itemCount; i++) {
    let idx: number;
    do { idx = Math.floor(Math.random() * FASHION_ITEMS.length); } while (used.has(idx));
    used.add(idx);
    const fi = FASHION_ITEMS[idx];
    selectedItems.push({ ...fi, qty: Math.random() > 0.7 ? 2 : 1 });
  }
  const amount = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    orderId: `CLZ-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    customer: pickRandom(CUSTOMERS),
    items: selectedItems,
    channel: pickRandom(CHANNELS),
    payment: pickRandom(PAYMENT_TYPES),
    deliveryType: pickRandom(DELIVERY_TYPES),
    store: pickRandom(STORES),
    amount,
    timestamp: new Date(),
  };
}

// ─── Sound generator (Web Audio beep) ────────────────────
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playBeep(880, now, 0.15);
    playBeep(1100, now + 0.18, 0.15);
    playBeep(880, now + 0.4, 0.15);
    playBeep(1100, now + 0.58, 0.15);
  } catch {
    // Audio not available
  }
}

// ─── Component ───────────────────────────────────────────
export function IncomingOrderAlert() {
  const isMobile = useIsMobile();
  const [enabled, setEnabled] = useState(() => localStorage.getItem(MOCK_ORDER_KEY) === 'true');
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [orderQueue, setOrderQueue] = useState<MockOrder[]>([]);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [packingTime, setPackingTime] = useState(15);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTE_KEY) === 'true');
  const [showDetails, setShowDetails] = useState(false);
  const [showRejectFlow, setShowRejectFlow] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleRef = useRef(true);

  // Persist mute
  useEffect(() => {
    localStorage.setItem(MUTE_KEY, String(isMuted));
  }, [isMuted]);

  // Listen for enabled flag
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === MOCK_ORDER_KEY) setEnabled(e.newValue === 'true');
    };
    window.addEventListener('storage', handler);
    const poll = setInterval(() => setEnabled(localStorage.getItem(MOCK_ORDER_KEY) === 'true'), 2000);
    return () => { window.removeEventListener('storage', handler); clearInterval(poll); };
  }, []);

  // Tab visibility — pause countdown
  useEffect(() => {
    const handler = () => { visibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const presentOrder = useCallback((o: MockOrder) => {
    setOrder(o);
    setCountdown(COUNTDOWN_SECS);
    setPackingTime(15);
    setShowDetails(false);
    setShowRejectFlow(false);
    setIsAccepting(false);
    setIsExpired(false);
  }, []);

  const showNextOrDismiss = useCallback(() => {
    setOrder(null);
    setOrderQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setTimeout(() => presentOrder(next), 400);
        return rest;
      }
      return prev;
    });
  }, [presentOrder]);

  const enqueueOrder = useCallback(() => {
    const newOrder = generateMockOrder();
    if (!order) {
      presentOrder(newOrder);
    } else {
      setOrderQueue(prev => [...prev, newOrder]);
    }
  }, [order, presentOrder]);

  // One-shot trigger from the demo controls
  useEffect(() => {
    const handler = () => enqueueOrder();
    window.addEventListener('seecen-simulate-order', handler);
    return () => window.removeEventListener('seecen-simulate-order', handler);
  }, [enqueueOrder]);

  // Broadcast pending order count for header badge
  useEffect(() => {
    const count = (order ? 1 : 0) + orderQueue.length;
    window.dispatchEvent(new CustomEvent('seecen-pending-orders', { detail: count }));
  }, [order, orderQueue]);

  // Main interval
  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(enqueueOrder, 5000);
    intervalRef.current = setInterval(enqueueOrder, INTERVAL_MS);
    return () => { clearTimeout(timeout); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, enqueueOrder]);

  // Clear the queue only when auto-orders are switched off (manual
  // simulations must survive this effect re-running).
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    if (prevEnabledRef.current && !enabled) {
      setOrder(null);
      setOrderQueue([]);
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  // Countdown
  useEffect(() => {
    if (order && !isExpired) {
      countdownRef.current = setInterval(() => {
        if (!visibleRef.current) return;
        setCountdown(prev => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }
  }, [order, isExpired]);

  // Expired auto-dismiss
  useEffect(() => {
    if (isExpired && order) {
      hapticTimeout();
      toast.error(`Order ${order.orderId} timed out`);
      const t = setTimeout(showNextOrDismiss, 2000);
      return () => clearTimeout(t);
    }
  }, [isExpired, order, showNextOrDismiss]);

  // Sound loop
  useEffect(() => {
    if (order && !isMuted && !isExpired) {
      playAlertSound();
      soundRef.current = setInterval(() => {
        if (!isMuted) playAlertSound();
      }, 4000);
      return () => { if (soundRef.current) clearInterval(soundRef.current); };
    } else {
      if (soundRef.current) clearInterval(soundRef.current);
    }
  }, [order, isMuted, isExpired]);

  // ── Haptic patterns ──
  const hapticAccept = () => {
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]); // double-tap success
  };
  const hapticReject = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]); // long buzz warning
  };
  const hapticTimeout = () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); // triple buzz alert
  };

  // ── Handlers ──
  const handleAccept = async () => {
    if (isAccepting || !order) return;
    setIsAccepting(true);
    await new Promise(r => setTimeout(r, 600));
    try {
      hapticAccept();
      toast.success(
        `Order ${order.orderId} accepted · Packing: ${packingTime} min`,
        { description: `${order.items.length} item(s) · ₹${order.amount.toLocaleString('en-IN')}` }
      );
      showNextOrDismiss();
    } catch {
      toast.error('Failed to accept order. Try again.');
      setIsAccepting(false);
    }
  };

  const handleReject = (reason: string) => {
    if (!order) return;
    hapticReject();
    toast.info(`Order ${order.orderId} rejected — ${reason}`);
    showNextOrDismiss();
  };

  // ── Derived ──
  if (!order) return null;
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress = (countdown / COUNTDOWN_SECS) * 100;
  const urgency: 'calm' | 'warning' | 'critical' =
    countdown > 60 ? 'calm' : countdown > 30 ? 'warning' : 'critical';

  const totalItems = order.items.reduce((s, i) => s + i.qty, 0);

  return (
    <AnimatePresence>
      {order && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Alert Container */}
          <motion.div
            key="alert"
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'fixed z-[101] bg-card shadow-2xl flex flex-col overflow-hidden',
              isMobile
                ? 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl'
                : 'top-1/2 left-1/2 w-full max-w-[440px] rounded-2xl max-h-[90vh]'
            )}
          >
            {/* ── Urgency progress bar ── */}
            <div className="h-1 w-full bg-muted shrink-0">
              <motion.div
                className={cn(
                  'h-full transition-colors duration-500',
                  urgency === 'calm' && 'bg-primary',
                  urgency === 'warning' && 'bg-warning',
                  urgency === 'critical' && 'bg-destructive',
                )}
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* ── Header ── */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  urgency === 'calm' && 'bg-primary/10',
                  urgency === 'warning' && 'bg-warning/10',
                  urgency === 'critical' && 'bg-destructive/10',
                )}>
                  <ShoppingBag className={cn(
                    'w-5 h-5',
                    urgency === 'calm' && 'text-primary',
                    urgency === 'warning' && 'text-warning',
                    urgency === 'critical' && 'text-destructive',
                  )} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">New order received</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] font-medium border-border">
                      {order.channel}
                    </Badge>
                    {orderQueue.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">+{orderQueue.length} queued</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Timer */}
                <div className={cn(
                  'px-3 py-1.5 rounded-xl font-mono text-sm font-bold tabular-nums',
                  urgency === 'calm' && 'bg-primary/10 text-primary',
                  urgency === 'warning' && 'bg-warning/10 text-warning',
                  urgency === 'critical' && 'bg-destructive/10 text-destructive animate-pulse',
                )}>
                  <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  {timerStr}
                </div>
                {/* Mute toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Expired overlay */}
              {isExpired && (
                <div className="absolute inset-0 z-10 bg-card/90 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-destructive" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Order timed out</p>
                  <p className="text-sm text-muted-foreground">This order was not accepted in time</p>
                </div>
              )}

              {/* Reject reason flow */}
              {showRejectFlow && !isExpired ? (
                <div className="px-5 py-4 space-y-3">
                  <button
                    onClick={() => setShowRejectFlow(false)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <p className="text-base font-semibold text-foreground">Why are you rejecting?</p>
                  <div className="space-y-2">
                    {REJECT_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => handleReject(reason)}
                        className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              ) : !isExpired && (
                <div className="px-5 pb-4 space-y-4">
                  {/* ── Order summary ── */}
                  <div className="space-y-3">
                    {/* Order ID + time */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-lg text-foreground tracking-tight">
                        {order.orderId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{order.customer.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.customer.returning ? 'Returning customer' : '1st order'}
                        </p>
                      </div>
                    </div>

                    {/* Store */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{order.store}</span>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap gap-2">
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', order.payment.color)}>
                        {order.payment.label}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground">
                        <Package className="w-3 h-3 mr-1" />
                        {order.deliveryType}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground">
                        {totalItems} item{totalItems > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* ── Divider ── */}
                  <div className="border-t border-dashed border-border" />

                  {/* ── Item details (collapsible) ── */}
                  <div>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="w-full flex items-center justify-between py-1"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        Order details · {totalItems} item{totalItems > 1 ? 's' : ''}
                      </span>
                      {showDetails
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>

                    <AnimatePresence initial={false}>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-muted/50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-sm font-semibold text-foreground">₹{item.price.toLocaleString('en-IN')}</p>
                                  <p className="text-xs text-muted-foreground">×{item.qty}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Total ── */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">Total bill</span>
                    <span className="text-2xl font-bold text-foreground tracking-tight">
                      ₹{order.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* ── Divider ── */}
                  <div className="border-t border-dashed border-border" />

                  {/* ── Packing time ── */}
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packing time
                    </span>
                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setPackingTime(Math.max(PACKING_MIN, packingTime - PACKING_STEP))}
                        disabled={packingTime <= PACKING_MIN}
                        className="w-12 h-12 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 transition-colors active:scale-95"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-center min-w-[80px]">
                        <span className="text-3xl font-bold text-foreground tabular-nums">{packingTime}</span>
                        <span className="text-sm text-muted-foreground ml-1">min</span>
                      </div>
                      <button
                        onClick={() => setPackingTime(Math.min(PACKING_MAX, packingTime + PACKING_STEP))}
                        disabled={packingTime >= PACKING_MAX}
                        className="w-12 h-12 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 transition-colors active:scale-95"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Presets */}
                    <div className="flex gap-2 justify-center">
                      {PACKING_PRESETS.map(t => (
                        <button
                          key={t}
                          onClick={() => setPackingTime(t)}
                          className={cn(
                            'h-9 px-4 rounded-xl text-sm font-medium transition-all active:scale-95',
                            packingTime === t
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {t} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sticky action area ── */}
            {!isExpired && !showRejectFlow && (
              <div className="shrink-0 border-t border-border bg-card px-5 pt-4 pb-5 space-y-3">
                {/* Accept button */}
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className={cn(
                    'w-full h-14 text-base font-bold rounded-2xl transition-all duration-300 shadow-lg',
                    urgency === 'calm' && 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20',
                    urgency === 'warning' && 'bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))] shadow-[hsl(var(--warning))]/20',
                    urgency === 'critical' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20 animate-pulse',
                  )}
                >
                  {isAccepting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Accept · {timerStr}</>
                  )}
                </Button>

                {/* Secondary actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowRejectFlow(true)}
                    className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors py-1"
                  >
                    Reject order
                  </button>
                  <div className="flex items-center gap-3">
                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-1">
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Full details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
