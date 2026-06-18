import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Product, ProductVariant } from './ProductCard';

interface VariantForm {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price_override: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  existingVariants: ProductVariant[];
  onSaved: () => void;
}

export function ProductFormDialog({ open, onOpenChange, editingProduct, existingVariants, onSaved }: ProductFormDialogProps) {
  const [form, setForm] = useState({
    name: '', brand: '', category: 'General', base_price: '', mrp: '', hsn_code: '', description: ''
  });
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        brand: editingProduct.brand || '',
        category: editingProduct.category,
        base_price: editingProduct.base_price.toString(),
        mrp: editingProduct.mrp?.toString() || '',
        hsn_code: editingProduct.hsn_code || '',
        description: editingProduct.description || ''
      });
      setVariants(existingVariants.map(v => ({
        id: v.id,
        size: v.size || '',
        color: v.color || '',
        sku: v.sku || '',
        price_override: v.price_override?.toString() || ''
      })));
    } else {
      setForm({ name: '', brand: '', category: 'General', base_price: '', mrp: '', hsn_code: '', description: '' });
      setVariants([{ size: '', color: '', sku: '', price_override: '' }]);
    }
  }, [editingProduct, existingVariants, open]);

  const addVariant = () => setVariants([...variants, { size: '', color: '', sku: '', price_override: '' }]);
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, field: keyof VariantForm, value: string) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.base_price) { toast.error('Name and price are required'); return; }
    setSaving(true);

    try {
      const productData = {
        name: form.name,
        brand: form.brand || null,
        category: form.category,
        base_price: parseFloat(form.base_price),
        mrp: form.mrp ? parseFloat(form.mrp) : null,
        hsn_code: form.hsn_code || null,
        description: form.description || null,
      };

      let productId: string;

      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        productId = editingProduct.id;

        // Delete removed variants
        const keptIds = variants.filter(v => v.id).map(v => v.id!);
        const toDelete = existingVariants.filter(v => !keptIds.includes(v.id));
        for (const v of toDelete) {
          await supabase.from('product_variants').delete().eq('id', v.id);
        }
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      // Upsert variants
      for (const v of variants) {
        if (!v.size && !v.color) continue; // skip empty rows
        const variantData = {
          product_id: productId,
          size: v.size || null,
          color: v.color || null,
          sku: v.sku || null,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
        };
        if (v.id) {
          await supabase.from('product_variants').update(variantData).eq('id', v.id);
        } else {
          await supabase.from('product_variants').insert(variantData);
        }
      }

      toast.success(editingProduct ? 'Product updated!' : 'Product added!');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-input" placeholder="e.g. Tops, Dresses" />
            </div>
            <div className="space-y-2">
              <Label>Base Price (₹) *</Label>
              <Input type="number" step="0.01" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} required className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input value={form.hsn_code} onChange={e => setForm({ ...form, hsn_code: e.target.value })} className="bg-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-input" rows={2} />
          </div>

          {/* Variants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Size / Color Variants</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="w-4 h-4 mr-1" /> Add Variant
              </Button>
            </div>
            {variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_80px_32px] gap-2 items-end">
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Size</Label>}
                  <Input value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} placeholder="S, M, L..." className="bg-input" />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Color</Label>}
                  <Input value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} placeholder="Black, Red..." className="bg-input" />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">SKU</Label>}
                  <Input value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="SKU-001" className="bg-input" />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Price ₹</Label>}
                  <Input type="number" value={v.price_override} onChange={e => updateVariant(idx, 'price_override', e.target.value)} placeholder="Override" className="bg-input" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeVariant(idx)} disabled={variants.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full btn-primary" disabled={saving}>
            {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
