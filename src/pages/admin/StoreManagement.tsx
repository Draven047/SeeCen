import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Store, MapPin, Phone, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export default function StoreManagement() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*').order('name');
    setStores(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStore) {
      const { error } = await supabase
        .from('stores')
        .update(form)
        .eq('id', editingStore.id);

      if (error) {
        toast.error('Failed to update store');
      } else {
        toast.success('Store updated!');
        resetForm();
        fetchStores();
      }
    } else {
      const { error } = await supabase.from('stores').insert(form);

      if (error) {
        toast.error('Failed to add store');
      } else {
        toast.success('Store added!');
        resetForm();
        fetchStores();
      }
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;

    const { error } = await supabase.from('stores').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete store');
    } else {
      toast.success('Store deleted');
      fetchStores();
    }
  };

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '' });
    setEditingStore(null);
    setDialogOpen(false);
  };

  const openEditDialog = (store: StoreData) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address || '',
      phone: store.phone || ''
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Store Management</h1>
            <p className="text-muted-foreground mt-1">Manage your store locations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Store
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingStore ? 'Edit Store' : 'Add New Store'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Store Name *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="bg-input"
                    placeholder="Main Street Store"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="bg-input"
                    placeholder="123 Main Street, City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="bg-input"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <Button type="submit" className="w-full btn-primary">
                  {editingStore ? 'Update Store' : 'Add Store'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No stores yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                stores.map(store => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {store.address ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {store.address}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.phone ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {store.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(store.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(store)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStore(store.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
