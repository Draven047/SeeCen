import { Star, Package, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Cigar {
  id: string;
  name: string;
  shape: string;
  wrapper: string;
  origin: string;
  price: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  stock_quantity: number | null;
  image_url: string | null;
  description: string | null;
  size: string | null;
  filler: string | null;
}

interface CigarPreviewDialogProps {
  cigar: Cigar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeQuantity?: number;
  isSales: boolean;
  onRequest: () => void;
  formatCurrency: (value: number) => string;
}

export function CigarPreviewDialog({
  cigar,
  open,
  onOpenChange,
  storeQuantity,
  isSales,
  onRequest,
  formatCurrency
}: CigarPreviewDialogProps) {
  if (!cigar) return null;

  // Parse size into length and ring gauge
  const parseSize = (size: string | null) => {
    if (!size) return { length: null, ringGauge: null };
    const match = size.match(/(\d+\.?\d*)\s*(?:inches|in|")?(?:\s*x\s*|\s+)(\d+)/i);
    if (match) {
      return { length: `${match[1]} inches`, ringGauge: match[2] };
    }
    return { length: size, ringGauge: null };
  };

  const { length, ringGauge } = parseSize(cigar.size);

  // Placeholder values (these would come from DB if available)
  const rating = 4.4;
  const reviews = 167;
  const strength = 'Mild to Medium';
  const aging = '3 years';
  const flavorNotes = ['Cream', 'Nuts', 'Cedar', 'Light Pepper'];

  const displayQty = storeQuantity !== undefined ? storeQuantity : cigar.stock_quantity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display text-2xl">{cigar.name}</DialogTitle>
          <p className="text-muted-foreground text-sm">Premium cigar details and specifications</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Main Content */}
          <div className="flex gap-6">
            {/* Image */}
            <div className="w-1/3 shrink-0">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {cigar.image_url ? (
                  <img src={cigar.image_url} alt={cigar.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              {/* Rating & Price */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-semibold">{rating}</span>
                </div>
                <span className="text-muted-foreground text-sm">({reviews} reviews)</span>
                <span className="text-2xl font-bold text-primary ml-auto">{formatCurrency(cigar.price)}</span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Shape</span>
                  <p className="font-semibold">{cigar.shape}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Origin</span>
                  <p className="font-semibold">{cigar.origin}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Length</span>
                  <p className="font-semibold">{length || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ring Gauge</span>
                  <p className="font-semibold">{ringGauge || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Strength</span>
                  <p className="font-semibold">{strength}</p>
                </div>
              </div>

              {/* Stock Badge */}
              <div>
                <span className="text-sm text-muted-foreground">Stock Information</span>
                <div className="mt-1">
                  <Badge className={cn(
                    'text-sm px-3 py-1',
                    cigar.stock_status === 'in_stock' && 'bg-green-600 text-white',
                    cigar.stock_status === 'low_stock' && 'bg-amber-500 text-white',
                    cigar.stock_status === 'out_of_stock' && 'bg-destructive text-white'
                  )}>
                    {displayQty} units in stock
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {cigar.description && (
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm leading-relaxed">{cigar.description}</p>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Wrapper</span>
              <p className="font-semibold">{cigar.wrapper}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Filler</span>
              <p className="font-semibold">{cigar.filler || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Aging</span>
              <p className="font-semibold">{aging}</p>
            </div>
          </div>

          {/* Flavor Notes */}
          <div>
            <h4 className="text-sm text-muted-foreground mb-2">Flavor Notes</h4>
            <div className="flex flex-wrap gap-2">
              {flavorNotes.map(note => (
                <Badge key={note} variant="outline" className="font-normal">{note}</Badge>
              ))}
            </div>
          </div>

          {/* Request Button (Sales only) */}
          {isSales && (
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => { onRequest(); onOpenChange(false); }}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Request More Stock
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
