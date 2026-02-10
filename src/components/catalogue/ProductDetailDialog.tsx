import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product, ProductVariant } from './ProductCard';

interface ProductDetailDialogProps {
  product: Product | null;
  variants: ProductVariant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (value: number) => string;
}

export function ProductDetailDialog({
  product,
  variants,
  open,
  onOpenChange,
  formatCurrency
}: ProductDetailDialogProps) {
  if (!product) return null;

  const imageUrl = product.image_urls?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
          <p className="text-muted-foreground text-sm">{product.brand} · {product.category}</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="flex gap-6">
            {/* Image */}
            <div className="w-1/3 shrink-0">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">{formatCurrency(product.base_price)}</span>
                {product.mrp && product.mrp > product.base_price && (
                  <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.mrp)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-semibold">{product.category}</p>
                </div>
                {product.hsn_code && (
                  <div>
                    <span className="text-muted-foreground">HSN Code</span>
                    <p className="font-semibold">{product.hsn_code}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Variants</span>
                  <p className="font-semibold">{variants.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-semibold">{product.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Variants Table */}
          {variants.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Size / Color Variants</h4>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>{v.size || '—'}</TableCell>
                        <TableCell>
                          {v.color ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: v.color.toLowerCase() }} />
                              {v.color}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{v.sku || '—'}</TableCell>
                        <TableCell>{v.price_override ? formatCurrency(v.price_override) : 'Base'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
