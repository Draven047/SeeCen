import { Package, Eye, Edit, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  hsn_code: string | null;
  base_price: number;
  mrp: number | null;
  description: string | null;
  image_urls: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  barcode: string | null;
  price_override: number | null;
  weight_grams: number | null;
  is_active: boolean;
  created_at: string;
}

interface ProductCardProps {
  product: Product;
  variantCount: number;
  totalStock: number;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatCurrency: (value: number) => string;
}

export function ProductCard({
  product,
  variantCount,
  totalStock,
  canManage,
  onView,
  onEdit,
  onDelete,
  formatCurrency
}: ProductCardProps) {
  const stockStatus = totalStock === 0 ? 'out' : totalStock < 10 ? 'low' : 'ok';
  const stockConfig = {
    ok: { label: 'In Stock', className: 'bg-green-500 text-white' },
    low: { label: 'Low Stock', className: 'bg-amber-500 text-white' },
    out: { label: 'Out of Stock', className: 'bg-destructive text-white' }
  };
  const status = stockConfig[stockStatus];
  const imageUrl = product.image_urls?.[0];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-44 bg-muted flex items-center justify-center">
        <Badge className={`absolute top-3 right-3 ${status.className}`}>{status.label}</Badge>
        {product.brand && (
          <Badge variant="outline" className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm">
            {product.brand}
          </Badge>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-16 h-16 text-muted-foreground/30" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg leading-tight truncate">{product.name}</h3>
          <p className="text-muted-foreground text-sm">{product.category}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span>{variantCount} variant{variantCount !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-xl font-bold text-primary">{formatCurrency(product.base_price)}</span>
        </div>

        {product.mrp && product.mrp > product.base_price && (
          <p className="text-xs text-muted-foreground">
            MRP: <span className="line-through">{formatCurrency(product.mrp)}</span>
          </p>
        )}

        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm text-muted-foreground">Total Stock:</span>
          <span className="text-sm font-medium">{totalStock} units</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={onEdit} aria-label={`Edit ${product.name}`}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onDelete} aria-label={`Delete ${product.name}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
