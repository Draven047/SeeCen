import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Edit2, Plus, ChevronDown, Search, Minus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Store { id: string; name: string; }
interface ProductOption { id: string; name: string; base_price: number; category: string; }

interface InventoryItem {
  id: string;
  quantity: number;
  min_stock_level: number | null;
  store_id: string;
  cigar_id: string;
  product_id: string | null;
  variant_id: string | null;
  cigar: { id: string; name: string; price: number } | null;
  product: { id: string; name: string; base_price: number; category: string } | null;
}

export default function InventoryManagement() {
  const isMobile = useIsMobile();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editMin, setEditMin] = useState(10);
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  useEffect(() => { fetchStores(); fetchProducts(); }, []);
  useEffect(() => { if (selectedStore) fetchInventory(); }, [selectedStore]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedStore) return;

    const channel = supabase
      .channel(`inventory-${selectedStore}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_inventory',
          filter: `store_id=eq.${selectedStore}`,
        },
        () => {
          // Refetch on any change from other users
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStore]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*').order('name');
    setStores(data || []);
    if (data && data.length > 0) setSelectedStore(data[0].id);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, base_price, category').eq('is_active', true).order('name');
    setProducts(data || []);
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('store_inventory')
      .select('*, cigar:cigars(id, name, price), product:products(id, name, base_price, category)')
      .eq('store_id', selectedStore);
    setInventory((data as unknown as InventoryItem[]) || []);
    setLoading(false);
  }, [selectedStore]);

  const addProductToInventory = async (productId: string) => {
    const { error } = await supabase.from('store_inventory').insert({
      store_id: selectedStore,
      cigar_id: productId,
      product_id: productId,
      quantity: 0,
      min_stock_level: 10,
    });
    if (error) {
      if (error.code === '23505') toast.error('Product already exists in this store');
      else toast.error('Failed to add product');
    } else {
      toast.success('Product added to inventory');
      fetchInventory();
    }
  };

  const updateInventory = async () => {
    if (!editItem) return;
    const { error } = await supabase
      .from('store_inventory')
      .update({ quantity: editQty, min_stock_level: editMin })
      .eq('id', editItem.id);
    if (error) toast.error('Failed to update inventory');
    else { toast.success('Inventory updated'); setEditDialog(false); fetchInventory(); }
  };

  const quickToggle = async (item: InventoryItem) => {
    const newQty = item.quantity > 0 ? 0 : (item.min_stock_level || 10);
    const { error } = await supabase
      .from('store_inventory')
      .update({ quantity: newQty })
      .eq('id', item.id);
    if (error) toast.error('Failed to update');
    else {
      toast.success(newQty > 0 ? 'Marked available' : 'Marked unavailable');
      fetchInventory();
    }
  };

  const bulkToggleCategory = async (category: string, items: InventoryItem[]) => {
    setBulkLoading(category);
    const allAvailable = items.every(i => i.quantity > 0);
    const newQty = allAvailable ? 0 : undefined; // 0 = mark all unavailable

    try {
      await Promise.all(
        items.map(item => {
          const targetQty = allAvailable ? 0 : (item.quantity > 0 ? item.quantity : (item.min_stock_level || 10));
          return supabase
            .from('store_inventory')
            .update({ quantity: targetQty })
            .eq('id', item.id);
        })
      );
      toast.success(allAvailable ? `All ${category} marked unavailable` : `All ${category} marked available`);
      fetchInventory();
    } catch {
      toast.error('Bulk update failed');
    }
    setBulkLoading(null);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setEditQty(item.quantity);
    setEditMin(item.min_stock_level || 10);
    setEditDialog(true);
  };

  const getItemName = (item: InventoryItem) => item.product?.name || item.cigar?.name || 'Unknown';
  const getItemPrice = (item: InventoryItem) => item.product?.base_price || item.cigar?.price || 0;
  const getItemCategory = (item: InventoryItem) => item.product?.category || 'Uncategorised';

  const existingProductIds = new Set(inventory.map(i => i.product_id || i.cigar_id));
  const availableProducts = products.filter(p => !existingProductIds.has(p.id));

  const filtered = inventory.filter(item =>
    getItemName(item).toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const cat = getItemCategory(item);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const getStockBadge = (qty: number, min: number) => {
    if (qty === 0) return { label: 'Out', class: 'bg-destructive/15 text-destructive' };
    if (qty < min) return { label: 'Low', class: 'bg-orange-500/15 text-orange-600' };
    return { label: `${qty}`, class: 'bg-emerald-500/15 text-emerald-600' };
  };

  const totalAvailable = inventory.filter(i => i.quantity > 0).length;
  const totalOut = inventory.filter(i => i.quantity === 0).length;
  const totalLow = inventory.filter(i => i.quantity > 0 && i.quantity < (i.min_stock_level || 10)).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-heading">Inventory</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Quick availability control · Live sync</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {stores.map(store => (
          <Button
            key={store.id}
            variant={selectedStore === store.id ? 'default' : 'outline'}
            size="sm"
            className="h-10 shrink-0 rounded-full px-4"
            onClick={() => setSelectedStore(store.id)}
          >
            {store.name}
          </Button>
        ))}
      </div>

      {selectedStore && (
        <>
          <div className="flex gap-2">
            <div className="flex-1 glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">{totalAvailable}</p>
              <p className="text-[11px] text-muted-foreground">Available</p>
            </div>
            <div className="flex-1 glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{totalLow}</p>
              <p className="text-[11px] text-muted-foreground">Low Stock</p>
            </div>
            <div className="flex-1 glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{totalOut}</p>
              <p className="text-[11px] text-muted-foreground">Out</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            <Select onValueChange={addProductToInventory}>
              <SelectTrigger className="w-11 h-11 p-0 justify-center rounded-xl shrink-0">
                <Plus className="w-5 h-5" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                {availableProducts.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">All products added</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {search ? 'No products match your search' : 'No inventory items yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => {
                const items = grouped[cat];
                const isOpen = !collapsedCategories.has(cat);
                const catAvailable = items.filter(i => i.quantity > 0).length;
                const allAvailable = items.every(i => i.quantity > 0);

                return (
                  <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
                    <div className="flex items-center glass-card rounded-xl">
                      <CollapsibleTrigger asChild>
                        <button className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors min-h-[48px]">
                          <div className="flex items-center gap-2">
                            <ChevronDown className={cn(
                              'w-4 h-4 text-muted-foreground transition-transform',
                              !isOpen && '-rotate-90'
                            )} />
                            <span className="font-semibold text-sm">{cat}</span>
                            <span className="text-xs text-muted-foreground">({items.length})</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {catAvailable}/{items.length} available
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      {/* Bulk toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 px-3 mr-1 gap-1.5 text-xs shrink-0"
                        disabled={bulkLoading === cat}
                        onClick={(e) => {
                          e.stopPropagation();
                          bulkToggleCategory(cat, items);
                        }}
                      >
                        {allAvailable ? (
                          <><ToggleRight className="w-4 h-4" /> All Off</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4" /> All On</>
                        )}
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <div className="space-y-1 mt-1">
                        {items.map(item => {
                          const isAvailable = item.quantity > 0;
                          const badge = getStockBadge(item.quantity, item.min_stock_level || 10);

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 glass-card rounded-xl px-4 py-3 min-h-[56px]"
                            >
                              <Switch
                                checked={isAvailable}
                                onCheckedChange={() => quickToggle(item)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm font-medium truncate',
                                  !isAvailable && 'text-muted-foreground line-through'
                                )}>
                                  {getItemName(item)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ₹{getItemPrice(item).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <span className={cn(
                                'text-xs font-semibold px-2 py-1 rounded-full shrink-0',
                                badge.class
                              )}>
                                {badge.label}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <p className="font-medium">{editItem ? getItemName(editItem) : ''}</p>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl shrink-0"
                  onClick={() => setEditQty(Math.max(0, editQty - 1))}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={e => setEditQty(parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold h-12 rounded-xl"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl shrink-0"
                  onClick={() => setEditQty(editQty + 1)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[0, 5, 10, 25, 50].map(v => (
                <button
                  key={v}
                  onClick={() => setEditQty(v)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]',
                    editQty === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Low Stock Alert Level</label>
              <Input
                type="number"
                min="0"
                value={editMin}
                onChange={e => setEditMin(parseInt(e.target.value) || 0)}
                className="mt-2 h-12 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button className="h-11" onClick={updateInventory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
