import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, ImagePlus, Sparkles, Save, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Footwear', 'Accessories', 'Ethnic', 'Sets', 'Other'];
const GENDERS = ['Men', 'Women', 'Unisex', 'Kids'];
const PRESET_COLORS = ['Black', 'White', 'Navy', 'Beige', 'Red', 'Blue', 'Green', 'Grey', 'Brown', 'Pink', 'Olive', 'Maroon', 'Teal', 'Rust', 'Lavender', 'Sage', 'Peach', 'Mauve', 'Charcoal', 'Khaki'];
const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', '28', '30', '32', '34', '36', '38', '7', '8', '9', '10', '11'];

const COLOR_MAP: Record<string, string> = {
  Black: '#000', White: '#fff', Navy: '#001f3f', Beige: '#f5f5dc', Red: '#e74c3c',
  Blue: '#3498db', Green: '#27ae60', Grey: '#95a5a6', Brown: '#8b4513', Pink: '#ff69b4',
  Olive: '#808000', Maroon: '#800000', Teal: '#008080', Rust: '#b7410e', Lavender: '#e6e6fa',
  Sage: '#bcb88a', Peach: '#ffdab9', Mauve: '#e0b0ff', Charcoal: '#36454f', Khaki: '#c3b091',
};

interface VariantRow {
  color: string;
  size: string;
  sku: string;
  barcode: string;
  priceOverride: string;
  stock: string;
}

export default function AddProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stores, currentStore } = useStore();

  // Section A
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [gender, setGender] = useState('Unisex');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState('10');
  const [selectedStoreId, setSelectedStoreId] = useState(currentStore?.id || '');

  // Section C
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [fit, setFit] = useState('');
  const [occasion, setOccasion] = useState('');
  const [washCare, setWashCare] = useState('');
  const [tags, setTags] = useState('');
  const [hsnCode, setHsnCode] = useState('');

  const [saving, setSaving] = useState(false);

  // Variant matrix
  const variants: VariantRow[] = useMemo(() => {
    if (selectedColors.length === 0 && selectedSizes.length === 0) return [];
    const colors = selectedColors.length > 0 ? selectedColors : [''];
    const sizes = selectedSizes.length > 0 ? selectedSizes : [''];
    const brandCode = (brand || 'CLZ').substring(0, 3).toUpperCase();
    const catCode = (category || 'GEN').substring(0, 3).toUpperCase();
    let idx = 1;
    return colors.flatMap(color =>
      sizes.map(size => {
        const colorCode = color ? color.substring(0, 3).toUpperCase() : '';
        const sizeCode = size || '';
        const sku = `${brandCode}-${catCode}-${String(idx++).padStart(3, '0')}${colorCode ? '-' + colorCode : ''}${sizeCode ? '-' + sizeCode : ''}`;
        return { color, size, sku, barcode: '', priceOverride: '', stock: initialStock };
      })
    );
  }, [selectedColors, selectedSizes, brand, category, initialStock]);

  const [variantOverrides, setVariantOverrides] = useState<Record<string, Partial<VariantRow>>>({});

  const getVariantKey = (color: string, size: string) => `${color}||${size}`;

  const updateVariantField = (color: string, size: string, field: keyof VariantRow, value: string) => {
    const key = getVariantKey(color, size);
    setVariantOverrides(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value }
    }));
  };

  const getVariantValue = (v: VariantRow, field: keyof VariantRow) => {
    const key = getVariantKey(v.color, v.size);
    return variantOverrides[key]?.[field] ?? v[field];
  };

  const toggleChip = (value: string, selected: string[], setter: (v: string[]) => void) => {
    setter(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const bulkFillStock = () => {
    const newOverrides: Record<string, Partial<VariantRow>> = {};
    variants.forEach(v => {
      const key = getVariantKey(v.color, v.size);
      newOverrides[key] = { ...(variantOverrides[key] || {}), stock: initialStock };
    });
    setVariantOverrides(newOverrides);
    toast.success(`All variant stock set to ${initialStock}`);
  };

  const essentialsValid = name.trim() && category && sellingPrice;

  const handleSave = async () => {
    if (!essentialsValid) {
      toast.error('Please fill in product name, category, and selling price');
      return;
    }
    if (!user) return;
    setSaving(true);

    try {
      const price = parseFloat(sellingPrice) || 0;
      const mrpVal = parseFloat(mrp) || null;
      const storeId = selectedStoreId || currentStore?.id;

      // 1. Insert product
      const { data: product, error: pErr } = await supabase.from('products').insert({
        name: name.trim(),
        category,
        brand: brand.trim() || null,
        base_price: price,
        mrp: mrpVal,
        hsn_code: hsnCode.trim() || null,
        description: description.trim() || null,
        is_active: true,
      }).select().single();

      if (pErr || !product) throw pErr || new Error('Failed to create product');

      // 2. Mirror to cigars table for backward compat
      const { data: cigar } = await supabase.from('cigars').insert({
        name: name.trim(),
        price,
        origin: brand.trim() || 'India',
        wrapper: category,
        shape: gender,
        description: description.trim() || null,
        stock_quantity: parseInt(initialStock) || 0,
        stock_status: (parseInt(initialStock) || 0) > 10 ? 'in_stock' : (parseInt(initialStock) || 0) > 0 ? 'low_stock' : 'out_of_stock',
      }).select().single();

      // 3. Insert variants
      if (variants.length > 0) {
        const variantInserts = variants.map(v => ({
          product_id: product.id,
          color: v.color || null,
          size: v.size || null,
          sku: getVariantValue(v, 'sku') || null,
          barcode: getVariantValue(v, 'barcode') || null,
          price_override: getVariantValue(v, 'priceOverride') ? parseFloat(getVariantValue(v, 'priceOverride')) : null,
          is_active: true,
        }));

        const { data: insertedVariants, error: vErr } = await supabase
          .from('product_variants')
          .insert(variantInserts)
          .select();

        if (vErr) throw vErr;

        // 4. Insert store inventory per variant
        if (storeId && insertedVariants) {
          const inventoryInserts = insertedVariants.map((iv, idx) => ({
            store_id: storeId,
            cigar_id: cigar?.id || product.id,
            product_id: product.id,
            variant_id: iv.id,
            quantity: parseInt(getVariantValue(variants[idx], 'stock')) || 0,
            min_stock_level: 10,
          }));

          await supabase.from('store_inventory').insert(inventoryInserts);
        }
      } else if (storeId) {
        // No variants — insert single inventory row
        await supabase.from('store_inventory').insert({
          store_id: storeId,
          cigar_id: cigar?.id || product.id,
          product_id: product.id,
          quantity: parseInt(initialStock) || 0,
          min_stock_level: 10,
        });
      }

      toast.success('Product created successfully!');
      navigate(`/catalogue/${product.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-24 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/catalogue')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Add Product</h1>
            <p className="text-sm text-muted-foreground">Quick add — fill essentials, publish fast</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ===== SECTION A: ESSENTIALS ===== */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Essentials</h2>

            {/* Product Name */}
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g. Oversized Graphic T-Shirt"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12"
              />
            </div>

            {/* Category chips */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium border transition-all',
                      category === c
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input placeholder="e.g. Zara, H&M, In-house" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>

            {/* Gender chips */}
            <div className="space-y-1.5">
              <Label>Gender / Audience</Label>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium border transition-all',
                      gender === g
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Image placeholder */}
            <div className="space-y-1.5">
              <Label>Product Images</Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Image upload coming soon — products can be created without images.</p>
            </div>

            {/* Pricing side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Selling Price (₹) *</Label>
                <Input type="number" min="0" placeholder="799" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="h-12 text-lg font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label>MRP (₹)</Label>
                <Input type="number" min="0" placeholder="1,099" value={mrp} onChange={e => setMrp(e.target.value)} className="h-12" />
              </div>
            </div>

            {/* Colors multi-select chips */}
            <div className="space-y-1.5">
              <Label>Colors</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleChip(c, selectedColors, setSelectedColors)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      selectedColors.includes(c)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: COLOR_MAP[c] || '#ccc' }}
                    />
                    {c}
                    {selectedColors.includes(c) && <X className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes multi-select chips */}
            <div className="space-y-1.5">
              <Label>Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleChip(s, selectedSizes, setSelectedSizes)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-all min-w-[40px] text-center',
                      selectedSizes.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial stock + Store */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Initial Stock (per variant)</Label>
                <Input type="number" min="0" value={initialStock} onChange={e => setInitialStock(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-1.5">
                <Label>Store</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ===== SECTION B: VARIANT MATRIX ===== */}
          {variants.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Variants ({variants.length})
                </h2>
                <Button variant="outline" size="sm" onClick={bulkFillStock}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Fill Stock
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Variant</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">SKU</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Price ₹</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">
                            {[v.color, v.size].filter(Boolean).join(' / ')}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={getVariantValue(v, 'sku')}
                              onChange={e => updateVariantField(v.color, v.size, 'sku', e.target.value)}
                              className="h-8 text-xs w-36"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              placeholder={sellingPrice || '—'}
                              value={getVariantValue(v, 'priceOverride')}
                              onChange={e => updateVariantField(v.color, v.size, 'priceOverride', e.target.value)}
                              className="h-8 text-xs w-20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={getVariantValue(v, 'stock')}
                              onChange={e => updateVariantField(v.color, v.size, 'stock', e.target.value)}
                              className="h-8 text-xs w-16"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ===== SECTION C: ADVANCED ===== */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Advanced Details</span>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 mt-3 p-4 bg-card border border-border rounded-xl">
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Product description..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Material / Fabric</Label>
                    <Input placeholder="e.g. 100% Cotton" value={material} onChange={e => setMaterial(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fit</Label>
                    <Input placeholder="e.g. Regular, Slim, Oversized" value={fit} onChange={e => setFit(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Occasion</Label>
                    <Input placeholder="e.g. Casual, Party, Formal" value={occasion} onChange={e => setOccasion(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Wash Care</Label>
                    <Input placeholder="e.g. Machine wash cold" value={washCare} onChange={e => setWashCare(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tags</Label>
                    <Input placeholder="Comma-separated tags" value={tags} onChange={e => setTags(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>HSN Code</Label>
                    <Input placeholder="e.g. 6109" value={hsnCode} onChange={e => setHsnCode(e.target.value)} />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Sticky Save Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {variants.length > 0 ? `${variants.length} variants` : 'No variants'}
            </div>
            <Button
              size="lg"
              className="h-12 px-8"
              disabled={!essentialsValid || saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Product
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
