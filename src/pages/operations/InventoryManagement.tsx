import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Edit2, Plus, AlertTriangle, TrendingDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  quantity: number;
  min_stock_level: number | null;
  store_id: string;
  cigar_id: string;
  cigar: { id: string; name: string; price: number };
}

interface Cigar {
  id: string;
  name: string;
  price: number;
}

export default function InventoryManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cigars, setCigars] = useState<Cigar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editMin, setEditMin] = useState(10);

  useEffect(() => {
    fetchStores();
    fetchCigars();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchInventory();
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*').order('name');
    setStores(data || []);
    if (data && data.length > 0) {
      setSelectedStore(data[0].id);
    }
    setLoading(false);
  };

  const fetchCigars = async () => {
    const { data } = await supabase.from('cigars').select('id, name, price').order('name');
    setCigars(data || []);
  };

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('store_inventory')
      .select('*, cigar:cigars(id, name, price)')
      .eq('store_id', selectedStore);
    setInventory((data as unknown as InventoryItem[]) || []);
    setLoading(false);
  };

  const addInventoryItem = async (cigarId: string) => {
    const { error } = await supabase.from('store_inventory').insert({
      store_id: selectedStore,
      cigar_id: cigarId,
      quantity: 0,
      min_stock_level: 10
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Product already exists in this store');
      } else {
        toast.error('Failed to add product');
      }
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

    if (error) {
      toast.error('Failed to update inventory');
    } else {
      toast.success('Inventory updated');
      setEditDialog(false);
      fetchInventory();
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setEditQty(item.quantity);
    setEditMin(item.min_stock_level || 10);
    setEditDialog(true);
  };

  const getStockStatus = (qty: number, min: number) => {
    if (qty === 0) return { label: 'Out of Stock', class: 'bg-destructive/20 text-destructive', icon: <AlertTriangle className="w-3 h-3" /> };
    if (qty < min) return { label: 'Low Stock', class: 'bg-orange-500/20 text-orange-600', icon: <TrendingDown className="w-3 h-3" /> };
    return { label: 'In Stock', class: 'bg-green-500/20 text-green-600', icon: <Check className="w-3 h-3" /> };
  };

  const currentStore = stores.find(s => s.id === selectedStore);
  const availableCigars = cigars.filter(c => !inventory.some(i => i.cigar_id === c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage stock levels across all stores</p>
        </div>
      </div>

      {/* Store Selector */}
      <div className="flex flex-wrap gap-2">
        {stores.map(store => (
          <Button
            key={store.id}
            variant={selectedStore === store.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStore(store.id)}
          >
            {store.name}
          </Button>
        ))}
      </div>

      {selectedStore && (
        <>
          {/* Add Product */}
          <div className="flex items-center gap-4">
            <Select onValueChange={addInventoryItem}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Add product to store..." />
              </SelectTrigger>
              <SelectContent>
                {availableCigars.map(cigar => (
                  <SelectItem key={cigar.id} value={cigar.id}>
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {cigar.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {availableCigars.length} products available to add
            </span>
          </div>

          {/* Inventory Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No inventory for {currentStore?.name}</p>
                      <p className="text-sm text-muted-foreground">Add products using the dropdown above</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map(item => {
                    const status = getStockStatus(item.quantity, item.min_stock_level || 10);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.cigar?.name || 'Unknown'}</TableCell>
                        <TableCell>₹{item.cigar?.price?.toLocaleString('en-IN') || 0}</TableCell>
                        <TableCell className="font-semibold">{item.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{item.min_stock_level || 10}</TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', status.class)}>
                            {status.icon}
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(item)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Product</label>
              <p className="text-muted-foreground">{editItem?.cigar?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Current Stock</label>
              <Input
                type="number"
                min="0"
                value={editQty}
                onChange={e => setEditQty(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Minimum Stock Level</label>
              <Input
                type="number"
                min="0"
                value={editMin}
                onChange={e => setEditMin(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={updateInventory}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
