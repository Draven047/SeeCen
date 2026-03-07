import { useEffect, useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Users, Store } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'sales' | 'operations';
  stores: { id: string; name: string }[];
}

interface StoreOption {
  id: string;
  name: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedStore, setSelectedStore] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, rolesRes, storesRes, assignmentsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('stores').select('id, name'),
      supabase.from('store_assignments').select('user_id, store_id, stores(id, name)')
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const assignments = assignmentsRes.data || [];

    const usersWithRoles: User[] = profiles.map(p => {
      const userRole = roles.find(r => r.user_id === p.id);
      const userStores = assignments
        .filter(a => a.user_id === p.id)
        .map(a => a.stores as unknown as { id: string; name: string })
        .filter(Boolean);

      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: (userRole?.role || 'sales') as 'admin' | 'sales' | 'operations',
        stores: userStores
      };
    });

    setUsers(usersWithRoles);
    setStores(storesRes.data || []);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'sales' | 'operations') => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated');
      fetchData();
    }
  };

  const assignUserToStore = async () => {
    if (!selectedUser || !selectedStore) return;

    const { error } = await supabase.from('store_assignments').insert({
      user_id: selectedUser.id,
      store_id: selectedStore
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('User already assigned to this store');
      } else {
        toast.error('Failed to assign user');
      }
    } else {
      toast.success('User assigned to store');
      setAssignDialogOpen(false);
      setSelectedStore('');
      fetchData();
    }
  };

  const removeStoreAssignment = async (userId: string, storeId: string) => {
    const { error } = await supabase
      .from('store_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('store_id', storeId);

    if (error) {
      toast.error('Failed to remove assignment');
    } else {
      toast.success('Assignment removed');
      fetchData();
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/20 text-destructive',
    operations: 'bg-info/20 text-info',
    sales: 'bg-success/20 text-success'
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage users and their store assignments</p>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Stores</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateUserRole(user.id, value as 'admin' | 'sales' | 'operations')}
                      >
                        <SelectTrigger className={`w-32 ${roleColors[user.role]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.stores.map(store => (
                          <span
                            key={store.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs"
                          >
                            <Store className="w-3 h-3" />
                            {store.name}
                            <button
                              onClick={() => removeStoreAssignment(user.id, store.id)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {user.stores.length === 0 && (
                          <span className="text-muted-foreground text-sm">No stores</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Assign Store
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle className="font-display">
                Assign {selectedUser?.full_name || selectedUser?.email} to Store
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Store</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Choose a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={assignUserToStore} className="w-full btn-primary" disabled={!selectedStore}>
                Assign to Store
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
