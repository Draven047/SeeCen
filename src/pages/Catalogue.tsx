import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Package, Filter, Store, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { CigarCard } from '@/components/catalogue/CigarCard';
import { CigarPreviewDialog } from '@/components/catalogue/CigarPreviewDialog';

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

interface StoreInventory {
  cigar_id: string;
  quantity: number;
  store_id: string;
}

interface UserStore {
  id: string;
  name: string;
}

interface StoreType {
  id: string;
  name: string;
}

export default function Catalogue() {
  const { role, user } = useAuth();
  const [cigars, setCigars] = useState<Cigar[]>([]);
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([]);
  const [userStores, setUserStores] = useState<UserStore[]>([]);
  const [allStores, setAllStores] = useState<StoreType[]>([]);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [shapeFilter, setShapeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Add/Edit Cigar Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCigar, setEditingCigar] = useState<Cigar | null>(null);
  const [form, setForm] = useState({
    name: '', shape: '', wrapper: '', origin: '', price: '', description: '', size: '', filler: ''
  });
  
  // Stock Request Dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCigar, setRequestCigar] = useState<Cigar | null>(null);
  const [requestQty, setRequestQty] = useState('1');
  const [requestNotes, setRequestNotes] = useState('');
  const [selectedStoreForRequest, setSelectedStoreForRequest] = useState('');
  
  // Preview Dialog
  const [previewCigar, setPreviewCigar] = useState<Cigar | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    // Fetch cigars
    const { data: cigarsData } = await supabase.from('cigars').select('*').order('name');
    setCigars((cigarsData as Cigar[]) || []);

    // Fetch all stores for filtering
    const { data: storesData } = await supabase.from('stores').select('id, name').order('name');
    setAllStores((storesData as StoreType[]) || []);

    // Fetch all store inventory
    const { data: inventoryData } = await supabase
      .from('store_inventory')
      .select('cigar_id, quantity, store_id');
    setStoreInventory(inventoryData || []);

    // Fetch user's assigned stores (for sales role)
    if (user?.id) {
      const { data: assignmentsData } = await supabase
        .from('store_assignments')
        .select('store_id, stores(id, name)')
        .eq('user_id', user.id);
      
      const stores = (assignmentsData || [])
        .map(a => a.stores as unknown as UserStore)
        .filter(Boolean);
      setUserStores(stores);
    }
    
    setLoading(false);
  };

  // Format currency
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  // Add/Edit cigar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cigarData = {
      name: form.name,
      shape: form.shape,
      wrapper: form.wrapper,
      origin: form.origin,
      price: parseFloat(form.price),
      description: form.description || null,
      size: form.size || null,
      filler: form.filler || null
    };

    if (editingCigar) {
      const { error } = await supabase.from('cigars').update(cigarData).eq('id', editingCigar.id);
      if (error) toast.error('Failed to update cigar');
      else { toast.success('Cigar updated!'); resetForm(); fetchData(); }
    } else {
      const { error } = await supabase.from('cigars').insert(cigarData);
      if (error) toast.error('Failed to add cigar');
      else { toast.success('Cigar added!'); resetForm(); fetchData(); }
    }
  };

  const resetForm = () => {
    setForm({ name: '', shape: '', wrapper: '', origin: '', price: '', description: '', size: '', filler: '' });
    setEditingCigar(null);
    setDialogOpen(false);
  };

  const openEditDialog = (cigar: Cigar) => {
    setEditingCigar(cigar);
    setForm({
      name: cigar.name,
      shape: cigar.shape,
      wrapper: cigar.wrapper,
      origin: cigar.origin,
      price: cigar.price.toString(),
      description: cigar.description || '',
      size: cigar.size || '',
      filler: cigar.filler || ''
    });
    setDialogOpen(true);
  };

  const deleteCigar = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cigar?')) return;
    const { error } = await supabase.from('cigars').delete().eq('id', id);
    if (error) toast.error('Failed to delete cigar');
    else { toast.success('Cigar deleted'); fetchData(); }
  };

  // Stock Request (for sales)
  const openRequestDialog = (cigar: Cigar) => {
    setRequestCigar(cigar);
    setRequestQty('1');
    setRequestNotes('');
    setSelectedStoreForRequest(allStores[0]?.id || '');
    setRequestDialogOpen(true);
  };

  const submitStockRequest = async () => {
    if (!requestCigar || !user?.id || !selectedStoreForRequest) return;
    
    const { error } = await supabase.from('stock_requests').insert({
      cigar_id: requestCigar.id,
      store_id: selectedStoreForRequest,
      quantity: parseInt(requestQty),
      requested_by: user.id,
      notes: requestNotes || null,
      status: 'pending' as const
    });

    if (error) {
      toast.error('Failed to submit stock request');
    } else {
      // Create notification for operations team
      const storeName = allStores.find(s => s.id === selectedStoreForRequest)?.name || 'Unknown Store';
      await supabase.from('notifications').insert({
        title: 'New Stock Request',
        message: `Stock request for ${requestCigar.name} (Qty: ${requestQty}) from ${storeName}`,
        type: 'stock_request',
        user_id: null // null means it's for all operations/admin users
      });
      
      toast.success('Stock request submitted!');
      setRequestDialogOpen(false);
    }
  };


  // Filters
  const brands = [...new Set(cigars.map(c => c.name.split(' ')[0]))].sort();
  const shapes = [...new Set(cigars.map(c => c.shape))];

  const getStoreQuantity = (cigarId: string, storeId?: string) => {
    if (storeId) {
      const inv = storeInventory.find(i => i.cigar_id === cigarId && i.store_id === storeId);
      return inv?.quantity || 0;
    }
    // Sum across all stores if no specific store
    return storeInventory
      .filter(i => i.cigar_id === cigarId)
      .reduce((sum, inv) => sum + inv.quantity, 0);
  };

  const filtered = cigars.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const cigarBrand = c.name.split(' ')[0];
    const matchBrand = brandFilter === 'all' || cigarBrand === brandFilter;
    const matchShape = shapeFilter === 'all' || c.shape === shapeFilter;
    let matchPrice = true;
    if (priceFilter === 'low') matchPrice = c.price < 1000;
    else if (priceFilter === 'mid') matchPrice = c.price >= 1000 && c.price < 5000;
    else if (priceFilter === 'high') matchPrice = c.price >= 5000;
    
    // Store filter
    let matchStore = true;
    if (storeFilter !== 'all') {
      matchStore = getStoreQuantity(c.id, storeFilter) > 0;
    }
    
    return matchSearch && matchBrand && matchShape && matchPrice && matchStore;
  });

  const stockClass = (status: string) => {
    if (status === 'in_stock') return 'stock-in-stock';
    if (status === 'low_stock') return 'stock-low-stock';
    return 'stock-out-of-stock';
  };

  const canManageCigars = role === 'admin' || role === 'operations';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Cigar Catalogue</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {role === 'sales' 
                ? 'Browse cigars and request stock from Operations when running low' 
                : 'Manage your premium cigar collection and inventory'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium">
              {filtered.length} cigars
            </div>
            
            
            {/* Admin/Operations: Add Cigar */}
            {canManageCigars && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />Add Cigar
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display">{editingCigar ? 'Edit Cigar' : 'Add New Cigar'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Shape *</Label>
                        <Input value={form.shape} onChange={e => setForm({...form, shape: e.target.value})} required className="bg-input" />
                      </div>
                      <div className="space-y-2">
                        <Label>Wrapper *</Label>
                        <Input value={form.wrapper} onChange={e => setForm({...form, wrapper: e.target.value})} required className="bg-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Origin *</Label>
                        <Input value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} required className="bg-input" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹) *</Label>
                        <Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required className="bg-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <Input value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="bg-input" placeholder="e.g., 5x50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Filler</Label>
                        <Input value={form.filler} onChange={e => setForm({...form, filler: e.target.value})} className="bg-input" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-input" />
                    </div>
                    <Button type="submit" className="w-full btn-primary">{editingCigar ? 'Update Cigar' : 'Add Cigar'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search cigars..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-input" />
              </div>
            </div>
            
            {/* Store Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Store</Label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> All Stores (HQ)</span>
                  </SelectItem>
                  {allStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      <span className="flex items-center gap-2"><Store className="w-4 h-4" /> {store.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Brand</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="All brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Shape</Label>
              <Select value={shapeFilter} onValueChange={setShapeFilter}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="All shapes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shapes</SelectItem>
                  {shapes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Price Range</Label>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="All prices" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All prices</SelectItem>
                  <SelectItem value="low">Under ₹1,000</SelectItem>
                  <SelectItem value="mid">₹1,000 - ₹5,000</SelectItem>
                  <SelectItem value="high">Over ₹5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Cigars Grid */}
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
            <h3 className="font-semibold text-lg">No cigars found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(cigar => (
              <CigarCard
                key={cigar.id}
                cigar={cigar}
                storeQuantity={storeFilter !== 'all' ? getStoreQuantity(cigar.id, storeFilter) : undefined}
                canManage={canManageCigars}
                isSales={role === 'sales'}
                onView={() => { setPreviewCigar(cigar); setPreviewOpen(true); }}
                onEdit={() => openEditDialog(cigar)}
                onDelete={() => deleteCigar(cigar.id)}
                onRequest={() => openRequestDialog(cigar)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stock Request Dialog (Sales only) */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="font-display">Request Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="font-semibold">{requestCigar?.name}</p>
              <p className="text-sm text-muted-foreground">{requestCigar?.wrapper} • {requestCigar?.origin}</p>
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <Select value={selectedStoreForRequest} onValueChange={setSelectedStoreForRequest}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {allStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="1" value={requestQty} onChange={e => setRequestQty(e.target.value)} className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} className="bg-input" placeholder="Any additional notes..." />
            </div>
            <Button onClick={submitStockRequest} className="w-full btn-primary" disabled={!selectedStoreForRequest || !requestQty}>
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <CigarPreviewDialog
        cigar={previewCigar}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        storeQuantity={storeFilter !== 'all' && previewCigar ? getStoreQuantity(previewCigar.id, storeFilter) : undefined}
        isSales={role === 'sales'}
        onRequest={() => { if (previewCigar) openRequestDialog(previewCigar); }}
        formatCurrency={formatCurrency}
      />
    </DashboardLayout>
  );
}
