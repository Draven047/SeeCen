import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Package, Edit2, Save, Loader2, Layers, Box, IndianRupee, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Product {
  id: string; name: string; brand: string | null; category: string; hsn_code: string | null;
  base_price: number; mrp: number | null; description: string | null; image_urls: string[] | null;
  is_active: boolean; created_at: string; updated_at: string;
}

interface Variant {
  id: string; product_id: string; sku: string | null; size: string | null; color: string | null;
  barcode: string | null; price_override: number | null; weight_grams: number | null; is_active: boolean;
}

interface InventoryRow {
  id: string; store_id: string; quantity: number; min_stock_level: number | null; variant_id: string | null;
  store?: { name: string } | null;
}

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'operations' || role === 'manager';

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable states
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editHsn, setEditHsn] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Variant inline edits
  const [variantEdits, setVariantEdits] = useState<Record<string, Partial<Variant>>>({});
  const [savingVariant, setSavingVariant] = useState<string | null>(null);

  // Inventory edits
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, number>>({});
  const [savingInventory, setSavingInventory] = useState<string | null>(null);

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: p }, { data: v }, { data: inv }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id!).single(),
      supabase.from('product_variants').select('*').eq('product_id', id!).order('color, size'),
      supabase.from('store_inventory').select('*, store:stores(name)').eq('product_id', id!),
    ]);
    setProduct(p as Product | null);
    setVariants((v as Variant[]) || []);
    setInventory((inv as unknown as InventoryRow[]) || []);
    if (p) { setEditName(p.name); setEditDesc(p.description || ''); setEditHsn(p.hsn_code || ''); }
    setLoading(false);
  };

  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const activeVariants = variants.filter(v => v.is_active).length;
  const stockStatus = totalStock === 0 ? 'Out of Stock' : totalStock < 20 ? 'Low Stock' : 'In Stock';
  const stockColor = totalStock === 0 ? 'bg-destructive' : totalStock < 20 ? 'bg-amber-500' : 'bg-emerald-500';

  const saveDetails = async () => {
    if (!product) return;
    setSavingDetails(true);
    const { error } = await supabase.from('products').update({
      name: editName, description: editDesc || null, hsn_code: editHsn || null,
    }).eq('id', product.id);
    if (error) toast.error('Failed to save');
    else { toast.success('Product updated'); setEditingDetails(false); fetchAll(); }
    setSavingDetails(false);
  };

  const saveVariant = async (vId: string) => {
    const edits = variantEdits[vId];
    if (!edits) return;
    setSavingVariant(vId);
    const update: any = {};
    if (edits.sku !== undefined) update.sku = edits.sku || null;
    if (edits.barcode !== undefined) update.barcode = edits.barcode || null;
    if (edits.price_override !== undefined) update.price_override = edits.price_override || null;
    const { error } = await supabase.from('product_variants').update(update).eq('id', vId);
    if (error) toast.error('Failed to save variant');
    else { toast.success('Variant updated'); setVariantEdits(prev => { const n = {...prev}; delete n[vId]; return n; }); fetchAll(); }
    setSavingVariant(null);
  };

  const toggleVariantActive = async (v: Variant) => {
    await supabase.from('product_variants').update({ is_active: !v.is_active }).eq('id', v.id);
    toast.success(v.is_active ? 'Variant deactivated' : 'Variant activated');
    fetchAll();
  };

  const saveInventoryQty = async (invId: string) => {
    const qty = inventoryEdits[invId];
    if (qty === undefined) return;
    setSavingInventory(invId);
    const { error } = await supabase.from('store_inventory').update({ quantity: qty }).eq('id', invId);
    if (error) toast.error('Failed to update stock');
    else { toast.success('Stock updated'); setInventoryEdits(prev => { const n = {...prev}; delete n[invId]; return n; }); fetchAll(); }
    setSavingInventory(null);
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  if (!product) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Product not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/catalogue')}>Back to Catalogue</Button>
      </div>
    </DashboardLayout>
  );

  const priceRange = variants.length > 0
    ? (() => {
        const prices = variants.filter(v => v.is_active).map(v => v.price_override || product.base_price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
      })()
    : fmt(product.base_price);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/catalogue')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Catalogue
        </Button>

        {/* Summary Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-5">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {product.image_urls?.[0] ? (
              <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-10 h-10 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold">{product.name}</h1>
                <p className="text-sm text-muted-foreground">{product.category}{product.brand ? ` · ${product.brand}` : ''}</p>
              </div>
              <Badge className={cn('text-white shrink-0', stockColor)}>{stockStatus}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IndianRupee className="w-4 h-4" />
                <span className="font-semibold text-foreground">{priceRange}</span>
                {product.mrp && product.mrp > product.base_price && (
                  <span className="line-through text-muted-foreground text-xs">MRP {fmt(product.mrp)}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span>{activeVariants} variant{activeVariants !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Box className="w-4 h-4" />
                <span>{totalStock} in stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="details">More Details</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{fmt(product.base_price)}</p>
                <p className="text-xs text-muted-foreground mt-1">Selling Price</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{product.mrp ? fmt(product.mrp) : '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">MRP</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{activeVariants}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Variants</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{totalStock}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Stock</p>
              </div>
            </div>
            {product.description && (
              <div className="bg-card border border-border rounded-xl p-4 mt-4">
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            )}
          </TabsContent>

          {/* VARIANTS */}
          <TabsContent value="variants">
            {variants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No variants created</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Variant</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">SKU</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Barcode</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Price</th>
                        <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Active</th>
                        {canManage && <th className="px-3 py-2.5" />}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map(v => {
                        const edits = variantEdits[v.id] || {};
                        const hasEdits = Object.keys(edits).length > 0;
                        return (
                          <tr key={v.id} className={cn('border-b border-border last:border-0', !v.is_active && 'opacity-50')}>
                            <td className="px-3 py-2 font-medium whitespace-nowrap">
                              {[v.color, v.size].filter(Boolean).join(' / ') || '—'}
                            </td>
                            <td className="px-3 py-2">
                              {canManage ? (
                                <Input
                                  value={edits.sku ?? v.sku ?? ''}
                                  onChange={e => setVariantEdits(prev => ({...prev, [v.id]: {...(prev[v.id]||{}), sku: e.target.value}}))}
                                  className="h-8 text-xs w-32"
                                />
                              ) : (
                                <span className="text-xs">{v.sku || '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {canManage ? (
                                <Input
                                  value={edits.barcode ?? v.barcode ?? ''}
                                  onChange={e => setVariantEdits(prev => ({...prev, [v.id]: {...(prev[v.id]||{}), barcode: e.target.value}}))}
                                  className="h-8 text-xs w-28"
                                />
                              ) : (
                                <span className="text-xs">{v.barcode || '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {canManage ? (
                                <Input
                                  type="number"
                                  value={edits.price_override ?? v.price_override ?? ''}
                                  placeholder={String(product.base_price)}
                                  onChange={e => setVariantEdits(prev => ({...prev, [v.id]: {...(prev[v.id]||{}), price_override: e.target.value ? parseFloat(e.target.value) : null as any}}))}
                                  className="h-8 text-xs w-20"
                                />
                              ) : (
                                <span className="text-xs">{v.price_override ? fmt(v.price_override) : fmt(product.base_price)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {canManage ? (
                                <Switch checked={v.is_active} onCheckedChange={() => toggleVariantActive(v)} />
                              ) : (
                                <Badge variant={v.is_active ? 'default' : 'secondary'}>{v.is_active ? 'Yes' : 'No'}</Badge>
                              )}
                            </td>
                            {canManage && (
                              <td className="px-3 py-2">
                                {hasEdits && (
                                  <Button size="sm" className="h-7 text-xs" disabled={savingVariant === v.id} onClick={() => saveVariant(v.id)}>
                                    {savingVariant === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                    Save
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* INVENTORY */}
          <TabsContent value="inventory">
            {inventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No inventory data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inventory.map(inv => {
                  const variant = variants.find(v => v.id === inv.variant_id);
                  const variantLabel = variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : 'Base';
                  const editQty = inventoryEdits[inv.id];
                  const hasEdit = editQty !== undefined;

                  return (
                    <div key={inv.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{variantLabel}</p>
                        <p className="text-xs text-muted-foreground">{inv.store?.name || 'Store'}</p>
                      </div>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={hasEdit ? editQty : inv.quantity}
                            onChange={e => setInventoryEdits(prev => ({...prev, [inv.id]: parseInt(e.target.value) || 0}))}
                            className="h-9 w-20 text-center"
                          />
                          {hasEdit && (
                            <Button size="sm" className="h-9" disabled={savingInventory === inv.id} onClick={() => saveInventoryQty(inv.id)}>
                              {savingInventory === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className={cn(
                          'text-sm font-semibold px-2 py-1 rounded-full',
                          inv.quantity === 0 ? 'bg-destructive/15 text-destructive' :
                          inv.quantity < (inv.min_stock_level || 10) ? 'bg-amber-500/15 text-amber-600' :
                          'bg-emerald-500/15 text-emerald-600'
                        )}>
                          {inv.quantity}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PRICING */}
          <TabsContent value="pricing">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Selling Price</p>
                  <p className="text-2xl font-bold">{fmt(product.base_price)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">MRP</p>
                  <p className="text-2xl font-bold">{product.mrp ? fmt(product.mrp) : '—'}</p>
                  {product.mrp && product.mrp > product.base_price && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {Math.round((1 - product.base_price / product.mrp) * 100)}% discount
                    </p>
                  )}
                </div>
              </div>

              {variants.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Variant</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Price</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">vs Base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.filter(v => v.is_active).map(v => {
                        const price = v.price_override || product.base_price;
                        const diff = price - product.base_price;
                        return (
                          <tr key={v.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-medium">{[v.color, v.size].filter(Boolean).join(' / ')}</td>
                            <td className="px-3 py-2 text-right">{fmt(price)}</td>
                            <td className={cn('px-3 py-2 text-right text-xs', diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                              {diff === 0 ? '—' : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* MORE DETAILS */}
          <TabsContent value="details">
            {editingDetails ? (
              <div className="space-y-4 bg-card border border-border rounded-xl p-4">
                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} />
                </div>
                <div className="space-y-1.5">
                  <Label>HSN Code</Label>
                  <Input value={editHsn} onChange={e => setEditHsn(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveDetails} disabled={savingDetails}>
                    {savingDetails ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditingDetails(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Product Info</h3>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => setEditingDetails(true)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Category:</span> <span className="font-medium ml-1">{product.category}</span></div>
                    <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium ml-1">{product.brand || '—'}</span></div>
                    <div><span className="text-muted-foreground">HSN Code:</span> <span className="font-medium ml-1">{product.hsn_code || '—'}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <span className="font-medium ml-1">{product.is_active ? 'Active' : 'Inactive'}</span></div>
                  </div>
                  {product.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
