import { Plus, ScanBarcode, X, Loader2, Keyboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function NewOrderFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const isOnNewOrder = location.pathname === '/orders/new';

  return (
    <>
      {/* FAB group */}
      <div
        className={cn(
          'fixed right-4 z-50 flex flex-col items-end gap-2',
          'bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)]'
        )}
      >
        {expanded && !isOnNewOrder && (
          <button
            onClick={() => {
              setExpanded(false);
              setShowScanner(true);
            }}
            className={cn(
              'flex items-center gap-2 rounded-full bg-card border border-border text-foreground shadow-lg',
              'h-12 px-4 text-sm font-medium',
              'active:scale-95 transition-all animate-fade-in',
              'hover:bg-muted/50'
            )}
            aria-label="Scan product"
          >
            <ScanBarcode className="h-4 w-4" />
            <span>Scan</span>
          </button>
        )}

        {isOnNewOrder ? (
          <button
            onClick={() => setShowScanner(true)}
            className={cn(
              'flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg',
              'h-14 px-5 text-sm font-semibold',
              'active:scale-95 transition-transform',
              'hover:bg-primary/90'
            )}
            aria-label="Scan product"
          >
            <ScanBarcode className="h-5 w-5" />
            <span>Scan</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (expanded) {
                navigate('/orders/new');
                setExpanded(false);
              } else {
                setExpanded(true);
              }
            }}
            onBlur={() => setTimeout(() => setExpanded(false), 200)}
            className={cn(
              'flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg',
              'h-14 px-5 text-sm font-semibold',
              'active:scale-95 transition-transform',
              'hover:bg-primary/90'
            )}
            aria-label="New Order"
          >
            <Plus className={cn('h-5 w-5 transition-transform', expanded && 'rotate-45')} />
            <span>Order</span>
          </button>
        )}
      </div>

      {/* Scanner Dialog */}
      <Dialog
        open={showScanner}
        onOpenChange={(open) => {
          if (!open) {
            if (scannerRef.current) {
              try { scannerRef.current.stop(); } catch {}
              scannerRef.current = null;
            }
            setScanning(false);
            setLastScanned(null);
          }
          setShowScanner(open);
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan Product Barcode
            </DialogTitle>
          </DialogHeader>
          <ScannerView
            show={showScanner}
            scannerRef={scannerRef}
            readerRef={readerRef}
            scanning={scanning}
            setScanning={setScanning}
            lastScanned={lastScanned}
            setLastScanned={setLastScanned}
            onProductFound={(productId) => {
              setShowScanner(false);
              if (scannerRef.current) {
                try { scannerRef.current.stop(); } catch {}
                scannerRef.current = null;
              }
              setScanning(false);
              if (isOnNewOrder) {
                window.dispatchEvent(new CustomEvent('barcode-product-found', { detail: { cigarId: productId } }));
              } else {
                navigate(`/orders/new?cigar=${productId}`);
              }
            }
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScannerView({
  show,
  scannerRef,
  readerRef,
  scanning,
  setScanning,
  lastScanned,
  setLastScanned,
  onProductFound,
  onClose,
}: {
  show: boolean;
  scannerRef: React.MutableRefObject<any>;
  readerRef: React.MutableRefObject<HTMLDivElement | null>;
  scanning: boolean;
  setScanning: (v: boolean) => void;
  lastScanned: string | null;
  setLastScanned: (v: string | null) => void;
  onProductFound: (cigarId: string) => void;
  onClose: () => void;
}) {
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualLookingUp, setManualLookingUp] = useState(false);

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (lookingUp || manualLookingUp) return;
    const isManual = !scanning;
    if (isManual) setManualLookingUp(true);
    else setLookingUp(true);
    setLastScanned(barcode);

    // 1. Check product_variants barcode
    const { data: variant } = await supabase
      .from('product_variants')
      .select('id, product_id, product:products(id, name)')
      .eq('barcode', barcode)
      .maybeSingle();

    if (variant?.product_id) {
      toast.success(`Found: ${(variant.product as any)?.name || 'Product'}`);
      onProductFound(variant.product_id);
      setLookingUp(false);
      setManualLookingUp(false);
      return;
    }

    // 2. Check product_variants SKU
    const { data: skuVariant } = await supabase
      .from('product_variants')
      .select('id, product_id, product:products(id, name)')
      .eq('sku', barcode)
      .maybeSingle();

    if (skuVariant?.product_id) {
      toast.success(`Found: ${(skuVariant.product as any)?.name || 'Product'}`);
      onProductFound(skuVariant.product_id);
      setLookingUp(false);
      setManualLookingUp(false);
      return;
    }

    toast.error(`No product found for barcode: ${barcode}`);
    setLookingUp(false);
    setManualLookingUp(false);
  }, [lookingUp, manualLookingUp, scanning, onProductFound, setLastScanned]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualBarcode.trim();
    if (!trimmed) return;
    lookupBarcode(trimmed);
  };

  const startScanner = useCallback(async () => {
    setError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const readerId = 'barcode-reader';

      await new Promise(r => setTimeout(r, 100));

      const el = document.getElementById(readerId);
      if (!el) {
        setError('Scanner element not found');
        setScanning(false);
        return;
      }

      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(100);
          try { scanner.stop(); } catch {}
          lookupBarcode(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err?.toString().includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setError('Could not start camera. Make sure no other app is using it.');
      }
      setScanning(false);
      // Auto-show manual entry on camera failure
      setShowManualEntry(true);
    }
  }, [lookupBarcode, scannerRef, setScanning]);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Camera viewfinder */}
      {!showManualEntry && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-72 mx-auto">
          <div id="barcode-reader" ref={readerRef} className="w-full h-full" />

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted p-6">
              <div className="text-center space-y-2">
                <ScanBarcode className="h-10 w-10 text-destructive/50 mx-auto" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {lookingUp && (
        <div className="flex items-center gap-2 justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Looking up: {lastScanned}</span>
        </div>
      )}

      {lastScanned && !lookingUp && !manualLookingUp && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Last scanned: <span className="font-mono font-medium text-foreground">{lastScanned}</span>
          </p>
        </div>
      )}

      {/* Manual barcode entry */}
      <div className="border-t border-border pt-3">
        {!showManualEntry ? (
          <button
            onClick={() => setShowManualEntry(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <Keyboard className="h-4 w-4" />
            Enter barcode manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Enter barcode or SKU</label>
            <div className="flex gap-2">
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="e.g. 8901234560012 or CWS-M-WHT"
                className="font-mono text-sm h-11"
                autoFocus
                disabled={manualLookingUp}
              />
              <Button
                type="submit"
                disabled={!manualBarcode.trim() || manualLookingUp}
                className="h-11 px-4 shrink-0"
              >
                {manualLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {!showManualEntry && (
        <p className="text-xs text-muted-foreground text-center">
          Point your camera at a product barcode. It will be matched and added to the order.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 min-h-[44px]"
          onClick={onClose}
        >
          Cancel
        </Button>
        {showManualEntry && !error && (
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => {
              setShowManualEntry(false);
              startScanner();
            }}
          >
            <ScanBarcode className="h-4 w-4 mr-1" />
            Use Camera
          </Button>
        )}
        {!showManualEntry && (error || (!scanning && !lookingUp)) && (
          <Button
            className="flex-1 min-h-[44px]"
            onClick={startScanner}
          >
            {error ? 'Retry' : 'Start Scanner'}
          </Button>
        )}
      </div>
    </div>
  );
}
