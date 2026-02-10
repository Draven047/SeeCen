import { Star, Package, Eye, ShoppingCart, Edit, Trash2 } from 'lucide-react';
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

interface CigarCardProps {
  cigar: Cigar;
  storeQuantity?: number;
  canManage: boolean;
  isSales: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRequest: () => void;
  formatCurrency: (value: number) => string;
}

export function CigarCard({
  cigar,
  storeQuantity,
  canManage,
  isSales,
  onView,
  onEdit,
  onDelete,
  onRequest,
  formatCurrency
}: CigarCardProps) {
  // Extract brand as first word of name
  const nameParts = cigar.name.split(' ');
  const brand = nameParts[0];
  const productName = nameParts.slice(1).join(' ');

  // Parse size into length and ring gauge (e.g., "5x50" or "5 inches x 50")
  const parseSize = (size: string | null) => {
    if (!size) return { length: null, ringGauge: null };
    const match = size.match(/(\d+\.?\d*)\s*(?:inches|in|")?(?:\s*x\s*|\s+)(\d+)/i);
    if (match) {
      return { length: `${match[1]} inches`, ringGauge: match[2] };
    }
    return { length: size, ringGauge: null };
  };

  const { length, ringGauge } = parseSize(cigar.size);

  // Placeholder rating and reviews (these would come from DB if available)
  const rating = 4.4;
  const reviews = 167;

  const stockStatusConfig = {
    in_stock: { label: 'In Stock', className: 'bg-green-500 text-white' },
    low_stock: { label: 'Low Stock', className: 'bg-amber-500 text-white' },
    out_of_stock: { label: 'Out of Stock', className: 'bg-destructive text-white' }
  };

  const statusConfig = stockStatusConfig[cigar.stock_status];
  const displayQty = storeQuantity !== undefined ? storeQuantity : cigar.stock_quantity || 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Image Section */}
      <div className="relative h-44 bg-muted flex items-center justify-center">
        {/* Rating Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-medium shadow-sm">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{rating}</span>
        </div>

        {/* Stock Status Badge */}
        <Badge className={cn('absolute top-3 right-3', statusConfig.className)}>
          {statusConfig.label}
        </Badge>

        {/* Image or Placeholder */}
        {cigar.image_url ? (
          <img src={cigar.image_url} alt={cigar.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-16 h-16 text-muted-foreground/30" />
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 border-t-4 border-primary/10">
        {/* Brand & Product Name */}
        <div>
          <h3 className="font-bold text-lg leading-tight">{brand}</h3>
          <p className="text-muted-foreground text-sm">{productName || cigar.shape}</p>
        </div>

        {/* Shape Badge & Price */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-normal">{cigar.shape}</Badge>
          <span className="text-xl font-bold text-primary">{formatCurrency(cigar.price)}</span>
        </div>

        {/* Specs Row */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {length && <span>Length: <span className="text-foreground font-medium">{length}</span></span>}
          {ringGauge && <span>Ring: <span className="text-foreground font-medium">{ringGauge}</span></span>}
        </div>

        {/* Strength & Reviews */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Mild to Medium</span>
          <span className="text-muted-foreground">{reviews} reviews</span>
        </div>

        {/* Stock Status Bar */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
          <span className="text-sm text-muted-foreground">Stock Status:</span>
          <span className={cn(
            'text-sm font-medium',
            cigar.stock_status === 'in_stock' && 'text-green-600 dark:text-green-400',
            cigar.stock_status === 'low_stock' && 'text-amber-600 dark:text-amber-400',
            cigar.stock_status === 'out_of_stock' && 'text-destructive'
          )}>
            {statusConfig.label} ({displayQty} units)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
          {isSales && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onRequest}>
              <ShoppingCart className="w-4 h-4" />
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
