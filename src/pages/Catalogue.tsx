import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Plus, Package, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ProductCard, type Product, type ProductVariant } from '@/components/catalogue/ProductCard';
import { ProductDetailDialog } from '@/components/catalogue/ProductDetailDialog';
import { ProductFormDialog } from '@/components/catalogue/ProductFormDialog';

export default function Catalogue() {
  const { role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Detail dialog
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: productsData }, { data: variantsData }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('product_variants').select('*').eq('is_active', true)
    ]);
    setProducts((productsData as Product[]) || []);

    // Group variants by product_id
    const map: Record<string, ProductVariant[]> = {};
    for (const v of (variantsData as ProductVariant[]) || []) {
      if (!map[v.product_id]) map[v.product_id] = [];
      map[v.product_id].push(v);
    }
    setVariantsMap(map);
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  const categories = [...new Set(products.map(p => p.category))].sort();
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort() as string[];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand?.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchBrand = brandFilter === 'all' || p.brand === brandFilter;
    return matchSearch && matchCategory && matchBrand;
  });

  const canManage = role === 'admin' || role === 'operations' || role === 'manager';

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product and all its variants?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error('Failed to delete product');
    else { toast.success('Product deleted'); fetchData(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-display">Product Catalogue</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse and manage your fashion product inventory
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </div>
            {canManage && (
              <Button className="btn-primary" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Brand</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="glass-card p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground mt-4">Loading catalogue...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-lg">No products found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or add a new product.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                variantCount={variantsMap[product.id]?.length || 0}
                totalStock={0} // Will be computed from store_inventory in later steps
                canManage={canManage}
                onView={() => { setDetailProduct(product); setDetailOpen(true); }}
                onEdit={() => openEdit(product)}
                onDelete={() => deleteProduct(product.id)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingProduct={editingProduct}
        existingVariants={editingProduct ? (variantsMap[editingProduct.id] || []) : []}
        onSaved={fetchData}
      />

      {/* Detail Dialog */}
      <ProductDetailDialog
        product={detailProduct}
        variants={detailProduct ? (variantsMap[detailProduct.id] || []) : []}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        formatCurrency={formatCurrency}
      />
    </DashboardLayout>
  );
}
