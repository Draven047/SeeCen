import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, Download, FileSpreadsheet, Check, AlertCircle, Store, Package, RefreshCw, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface StoreOption {
  id: string;
  name: string;
}

export default function CatalogueManager() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'catalogue' | 'inventory'>('catalogue');
  const [inventoryAction, setInventoryAction] = useState<'add' | 'replace'>('add');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase.from('stores').select('id, name').order('name');
      setStores(data || []);
    };
    fetchStores();
  }, []);

  const downloadTemplate = (type: 'catalogue' | 'inventory') => {
    const headers = type === 'catalogue' 
      ? ['brand', 'name', 'shape', 'length', 'ring_gauge', 'price', 'stock', 'description', 'origin', 'wrapper', 'filler', 'strength', 'flavor_notes', 'aging', 'image', 'rating', 'reviews', 'category']
      : ['cigar_name', 'quantity', 'min_stock_level'];
    
    const sampleData = type === 'catalogue'
      ? ['Cohiba', 'Robusto', 'Robusto', '5 inches', '50', '3375', '120', '"A premium Cuban cigar with rich, complex flavors"', 'Cuba', 'Connecticut Shade', 'Cuban Ligero', 'Medium to Full', '"Leather,Cedar,Coffee,Spice"', '5 years', 'https://example.com/image.jpg', '4.8', '127', 'Premium']
      : ['Cohiba Robusto', '50', '10'];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'catalogue' ? 'cigar_catalogue_template.csv' : 'inventory_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  const handleCatalogueUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error('No data found in CSV');
        setUploading(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const fullName = row.brand ? `${row.brand} ${row.name}` : row.name;
        
        if (!fullName || !row.origin || !row.wrapper || !row.shape || !row.price) {
          errors.push(`Missing required fields for: ${fullName || 'Unknown'}`);
          failed++;
          continue;
        }

        const size = row.length && row.ring_gauge ? `${row.length} x ${row.ring_gauge}` : (row.length || row.ring_gauge || null);

        const { error } = await supabase.from('cigars').upsert({
          name: fullName,
          origin: row.origin,
          wrapper: row.wrapper,
          filler: row.filler || null,
          shape: row.shape,
          size: size,
          price: parseFloat(row.price) || 0,
          description: row.description || null,
          stock_quantity: parseInt(row.stock) || 0,
          image_url: row.image || null
        }, { onConflict: 'name' });

        if (error) {
          errors.push(`Failed to add ${fullName}: ${error.message}`);
          failed++;
        } else {
          success++;
        }
      }

      setUploadResult({ success, failed, errors });
      if (success > 0) toast.success(`${success} cigars uploaded successfully`);
      if (failed > 0) toast.error(`${failed} items failed`);
    } catch (error) {
      toast.error('Failed to parse CSV file');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInventoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error('No data found in CSV');
        setUploading(false);
        return;
      }

      const { data: cigars } = await supabase.from('cigars').select('id, name');
      const cigarMap = new Map(cigars?.map(c => [c.name.toLowerCase(), c.id]) || []);

      // If replacing, first clear existing inventory for this store
      if (inventoryAction === 'replace') {
        await supabase.from('store_inventory').delete().eq('store_id', selectedStore);
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const cigarId = cigarMap.get(row.cigar_name?.toLowerCase());
        if (!cigarId) {
          errors.push(`Cigar not found in catalogue: ${row.cigar_name}`);
          failed++;
          continue;
        }

        if (inventoryAction === 'add') {
          // Check if exists, then add to quantity
          const { data: existing } = await supabase
            .from('store_inventory')
            .select('quantity')
            .eq('store_id', selectedStore)
            .eq('cigar_id', cigarId)
            .maybeSingle();

          const newQuantity = (existing?.quantity || 0) + (parseInt(row.quantity) || 0);

          const { error } = await supabase.from('store_inventory').upsert({
            store_id: selectedStore,
            cigar_id: cigarId,
            quantity: newQuantity,
            min_stock_level: parseInt(row.min_stock_level) || 10
          }, { onConflict: 'store_id,cigar_id' });

          if (error) {
            errors.push(`Failed to update ${row.cigar_name}: ${error.message}`);
            failed++;
          } else {
            success++;
          }
        } else {
          // Replace mode - just insert/upsert
          const { error } = await supabase.from('store_inventory').upsert({
            store_id: selectedStore,
            cigar_id: cigarId,
            quantity: parseInt(row.quantity) || 0,
            min_stock_level: parseInt(row.min_stock_level) || 10
          }, { onConflict: 'store_id,cigar_id' });

          if (error) {
            errors.push(`Failed to update ${row.cigar_name}: ${error.message}`);
            failed++;
          } else {
            success++;
          }
        }
      }

      setUploadResult({ success, failed, errors });
      if (success > 0) toast.success(`${success} inventory items ${inventoryAction === 'add' ? 'added' : 'replaced'} successfully`);
      if (failed > 0) toast.error(`${failed} items failed`);
    } catch (error) {
      toast.error('Failed to parse CSV file');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedStoreName = stores.find(s => s.id === selectedStore)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-heading">Catalogue Manager</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Add new products to catalogue or manage store-specific inventory
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'catalogue' | 'inventory'); setUploadResult(null); }}>
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
          <TabsTrigger value="catalogue" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Master Catalogue
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Inventory
          </TabsTrigger>
        </TabsList>

        {/* Catalogue Upload Tab */}
        <TabsContent value="catalogue" className="mt-6 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Upload Master Catalogue</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add or update the master product database. New products will be added, existing ones updated by name.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => downloadTemplate('catalogue')}>
                <Download className="w-4 h-4 mr-2" /> Download Template
              </Button>
              
              <div className="relative">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCatalogueUpload}
                  className="hidden"
                  id="catalogue-file-input"
                />
                <Button
                  onClick={() => document.getElementById('catalogue-file-input')?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Catalogue CSV'}
                </Button>
              </div>
            </div>
          </div>

          {/* Catalogue Format Guide */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">CSV Format</h4>
            </div>
            <code className="text-xs bg-muted px-3 py-2 rounded-lg block overflow-x-auto whitespace-nowrap">
              brand, name, shape, length, ring_gauge, price, stock, description, origin, wrapper, filler, strength, flavor_notes, aging, image, rating, reviews, category
            </code>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Required:</span> brand, name, origin, wrapper, shape, price
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> Brand + name will be combined. Length + ring_gauge will become size.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Inventory Upload Tab */}
        <TabsContent value="inventory" className="mt-6 space-y-6">
          {/* Store Selection */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Select Store</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose which store's inventory you want to update
                </p>
              </div>
            </div>

            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStore && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-600">
                  Managing inventory for: <span className="font-bold">{selectedStoreName}</span>
                </p>
              </div>
            )}
          </div>

          {/* Action Cards */}
          {selectedStore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Add Stock Card */}
              <div 
                className={cn(
                  "glass-card p-6 cursor-pointer transition-all border-2",
                  inventoryAction === 'add' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:border-border"
                )}
                onClick={() => setInventoryAction('add')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    inventoryAction === 'add' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Plus className={cn("w-5 h-5", inventoryAction === 'add' ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Add to Stock</h4>
                    <p className="text-xs text-muted-foreground">Add quantities to existing inventory</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  CSV quantities will be <span className="font-medium text-foreground">added</span> to current stock levels. 
                  Use this when receiving new shipments.
                </p>
              </div>

              {/* Replace Stock Card */}
              <div 
                className={cn(
                  "glass-card p-6 cursor-pointer transition-all border-2",
                  inventoryAction === 'replace' 
                    ? "border-warning bg-warning/5" 
                    : "border-transparent hover:border-border"
                )}
                onClick={() => setInventoryAction('replace')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    inventoryAction === 'replace' ? "bg-warning/20" : "bg-muted"
                  )}>
                    <RefreshCw className={cn("w-5 h-5", inventoryAction === 'replace' ? "text-warning" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Replace Stock</h4>
                    <p className="text-xs text-muted-foreground">Overwrite entire inventory</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Existing inventory will be <span className="font-medium text-foreground">cleared</span> and replaced with CSV data. 
                  Use this for full stock audits.
                </p>
              </div>
            </div>
          )}

          {/* Upload Section */}
          {selectedStore && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  inventoryAction === 'add' ? "bg-primary/10" : "bg-warning/10"
                )}>
                  <Upload className={cn("w-5 h-5", inventoryAction === 'add' ? "text-primary" : "text-warning")} />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {inventoryAction === 'add' ? 'Add Stock to' : 'Replace Stock for'} {selectedStoreName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {inventoryAction === 'add' 
                      ? 'Quantities in CSV will be added to existing stock'
                      : 'This will clear all existing inventory and replace with CSV data'
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => downloadTemplate('inventory')}>
                  <Download className="w-4 h-4 mr-2" /> Download Template
                </Button>
                
                <div className="relative">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleInventoryUpload}
                    className="hidden"
                    id="inventory-file-input"
                  />
                  <Button
                    variant={inventoryAction === 'replace' ? 'destructive' : 'default'}
                    onClick={() => document.getElementById('inventory-file-input')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : (inventoryAction === 'add' ? 'Add Stock CSV' : 'Replace Stock CSV')}
                  </Button>
                </div>
              </div>

              {inventoryAction === 'replace' && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">
                    ⚠️ Warning: Replace mode will delete all existing inventory for {selectedStoreName} before importing new data.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Inventory Format Guide */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Inventory CSV Format</h4>
            </div>
            <code className="text-xs bg-muted px-3 py-2 rounded-lg block">
              cigar_name, quantity, min_stock_level
            </code>
            <p className="text-xs text-muted-foreground mt-3">
              <span className="font-medium text-foreground">Note:</span> cigar_name must exactly match entries in the master catalogue (e.g., "Cohiba Robusto")
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Results */}
      {uploadResult && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="font-semibold mb-4">Upload Results</h3>
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{uploadResult.success}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
            </div>
            {uploadResult.failed > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{uploadResult.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            )}
          </div>
          {uploadResult.errors.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-4 max-h-40 overflow-y-auto">
              {uploadResult.errors.map((err, i) => (
                <p key={i} className="text-sm text-destructive mb-1">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
