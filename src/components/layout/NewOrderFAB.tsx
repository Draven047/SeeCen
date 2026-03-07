import { Plus, ScanBarcode } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NewOrderFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Hide on the create-order page itself
  if (location.pathname === '/orders/new') return null;

  return (
    <>
      {/* FAB group */}
      <div
        className={cn(
          'fixed right-4 z-50 flex flex-col items-end gap-2',
          'bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)]'
        )}
      >
        {/* Scanner mini FAB — shown when expanded */}
        {expanded && (
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

        {/* Main FAB */}
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
      </div>

      {/* Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan Product Barcode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="aspect-square max-h-64 mx-auto bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center space-y-2">
                <ScanBarcode className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Camera scanner</p>
                <p className="text-xs text-muted-foreground/60">Point camera at product barcode</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Barcode scanning requires camera permission. Scanned products will be added to your cart automatically.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => setShowScanner(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  toast.info('Scanner will connect to your device camera. Coming soon!');
                  setShowScanner(false);
                  navigate('/orders/new');
                }}
              >
                Open Scanner & Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
