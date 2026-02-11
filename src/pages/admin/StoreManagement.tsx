import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Store, MapPin, Phone, Edit, Users, UserPlus, Shield, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoreData {
  id: string; name: string; address: string | null; phone: string | null; created_at: string;
}

interface UserWithRole {
  id: string; email: string; full_name: string | null; role: string; is_approved: boolean;
}

interface StoreAssignment {
  user_id: string; store_id: string;
}

function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function StoreManagement() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [assignments, setAssignments] = useState<StoreAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  const [assignDialog, setAssignDialog] = useState(false);
  const [assignStoreId, setAssignStoreId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('sales');

  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [storesRes, profilesRes, rolesRes, assignRes] = await Promise.all([
      supabase.from('stores').select('*').order('name'),
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('user_roles').select('user_id, role, is_approved'),
      supabase.from('store_assignments').select('user_id, store_id'),
    ]);
    setStores(storesRes.data || []);
    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    setUsers(profiles.map(p => {
      const role = roles.find(r => r.user_id === p.id);
      return { ...p, role: role?.role || 'sales', is_approved: role?.is_approved ?? false };
    }));
    setAssignments((assignRes.data || []) as StoreAssignment[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      const { error } = await supabase.from('stores').update(form).eq('id', editingStore.id);
      if (error) toast.error('Failed to update'); else { toast.success('Store updated'); resetForm(); fetchAll(); }
    } else {
      const { error } = await supabase.from('stores').insert(form);
      if (error) toast.error('Failed to add'); else { toast.success('Store added'); resetForm(); fetchAll(); }
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm('Delete this store and all assignments?')) return;
    await supabase.from('store_assignments').delete().eq('store_id', id);
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) toast.error('Failed'); else { toast.success('Deleted'); fetchAll(); }
  };

  const resetForm = () => { setForm({ name: '', address: '', phone: '' }); setEditingStore(null); setDialogOpen(false); };

  const openEdit = (s: StoreData) => {
    setEditingStore(s);
    setForm({ name: s.name, address: s.address || '', phone: s.phone || '' });
    setDialogOpen(true);
  };

  const assignUser = async () => {
    if (!assignStoreId || !assignUserId) return;
    const { error } = await supabase.from('store_assignments').insert({ user_id: assignUserId, store_id: assignStoreId });
    if (error?.code === '23505') toast.error('Already assigned');
    else if (error) toast.error('Failed');
    else { toast.success('Assigned'); setAssignDialog(false); setAssignUserId(''); fetchAll(); }
  };

  const removeAssignment = async (userId: string, storeId: string) => {
    await supabase.from('store_assignments').delete().eq('user_id', userId).eq('store_id', storeId);
    toast.success('Removed'); fetchAll();
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
    if (error) toast.error('Failed'); else { toast.success('Role updated'); fetchAll(); }
  };

  const getStoreUsers = (storeId: string) => {
    const userIds = assignments.filter(a => a.store_id === storeId).map(a => a.user_id);
    return users.filter(u => userIds.includes(u.id));
  };

  const unassignedUsers = (storeId: string) => {
    const assigned = assignments.filter(a => a.store_id === storeId).map(a => a.user_id);
    return users.filter(u => !assigned.includes(u.id) && u.is_approved);
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive', manager: 'bg-purple-500/10 text-purple-600',
    operations: 'bg-blue-500/10 text-blue-600', sales: 'bg-emerald-500/10 text-emerald-600',
    finance: 'bg-amber-500/10 text-amber-600', viewer: 'bg-gray-500/10 text-gray-600',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Store Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage store profiles and user assignments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(stores.map(s => ({ name: s.name, address: s.address, phone: s.phone, employees: getStoreUsers(s.id).length })), 'stores.csv')}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Store</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingStore ? 'Edit Store' : 'Add Store'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label>Store Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Main Street Store" /></div>
                  <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
                  <Button type="submit" className="w-full">{editingStore ? 'Update' : 'Add'} Store</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="stores">
          <TabsList>
            <TabsTrigger value="stores"><Store className="w-3 h-3 mr-1" /> Stores ({stores.length})</TabsTrigger>
            <TabsTrigger value="assignments"><Users className="w-3 h-3 mr-1" /> Assignments</TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(store => {
                const storeUsers = getStoreUsers(store.id);
                return (
                  <Card key={store.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setSelectedStore(selectedStore?.id === store.id ? null : store)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary" />
                          </div>
                          <CardTitle className="text-base">{store.name}</CardTitle>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(store)}><Edit className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteStore(store.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {store.address && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {store.address}</p>}
                      {store.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {store.phone}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{storeUsers.length} members</span>
                        {storeUsers.slice(0, 3).map(u => (
                          <Badge key={u.id} variant="outline" className="text-[9px]">{u.full_name || u.email.split('@')[0]}</Badge>
                        ))}
                        {storeUsers.length > 3 && <span className="text-[10px] text-muted-foreground">+{storeUsers.length - 3}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {stores.length === 0 && (
                <div className="col-span-full glass-card p-12 text-center">
                  <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No stores yet</p>
                </div>
              )}
            </div>

            {/* Expanded store detail */}
            {selectedStore && (
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{selectedStore.name} — Team Members</CardTitle>
                    <Button size="sm" onClick={() => { setAssignStoreId(selectedStore.id); setAssignDialog(true); }}>
                      <UserPlus className="w-3 h-3 mr-1" /> Assign User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getStoreUsers(selectedStore.id).map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm font-medium">{u.full_name || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={v => updateRole(u.id, v)}>
                              <SelectTrigger className="w-[120px] h-7">
                                <Badge variant="secondary" className={cn('text-[10px]', roleColors[u.role])}>{u.role}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {['admin', 'manager', 'sales', 'operations', 'finance', 'viewer'].map(r => (
                                  <SelectItem key={r} value={r}><span className="capitalize">{r}</span></SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeAssignment(u.id, selectedStore.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getStoreUsers(selectedStore.id).length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No users assigned</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assignments overview Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Stores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const userStores = assignments.filter(a => a.user_id === u.id).map(a => stores.find(s => s.id === a.store_id)?.name).filter(Boolean);
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm font-medium">{u.full_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="secondary" className={cn('text-[10px]', roleColors[u.role])}>{u.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={u.is_approved ? 'secondary' : 'outline'} className="text-[10px]">
                            {u.is_approved ? 'Active' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {userStores.map((name, i) => <Badge key={i} variant="outline" className="text-[9px]">{name}</Badge>)}
                            {userStores.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign User Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Store</DialogTitle>
            <DialogDescription>Select a user to assign to {stores.find(s => s.id === assignStoreId)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {unassignedUsers(assignStoreId).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={assignUser} disabled={!assignUserId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
