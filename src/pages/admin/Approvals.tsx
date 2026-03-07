import { useEffect, useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserCheck, UserX, Clock, Users, Store, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_approved: boolean;
  created_at: string;
  stores: { id: string; name: string }[];
}

interface StoreOption {
  id: string;
  name: string;
}

export default function Approvals() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRole, setSelectedRole] = useState('sales');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<PendingUser | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('approvals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

    const usersWithRoles: PendingUser[] = profiles.map(p => {
      const userRole = roles.find(r => r.user_id === p.id);
      const userStores = assignments
        .filter(a => a.user_id === p.id)
        .map(a => a.stores as unknown as { id: string; name: string })
        .filter(Boolean);

      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: userRole?.role || 'sales',
        is_approved: userRole?.is_approved ?? false,
        created_at: p.created_at,
        stores: userStores
      };
    });

    setUsers(usersWithRoles);
    setStores(storesRes.data || []);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'approved') return u.is_approved;
    return true;
  });

  const pendingCount = users.filter(u => !u.is_approved).length;

  const handleApprove = (u: PendingUser) => {
    setSelectedUser(u);
    setSelectedRole(u.role);
    setSelectedStore('');
    setAssignDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedUser) return;

    // Update role + approve
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ is_approved: true, role: selectedRole as any })
      .eq('user_id', selectedUser.id);

    if (roleError) {
      toast.error('Failed to approve user');
      return;
    }

    // Assign store if selected
    if (selectedStore) {
      await supabase.from('store_assignments').insert({
        user_id: selectedUser.id,
        store_id: selectedStore
      });
    }

    // Create notification for the approved user
    await supabase.from('notifications').insert({
      user_id: selectedUser.id,
      title: 'Account Approved',
      message: `Your account has been approved! You now have ${selectedRole} access.`,
      type: 'info'
    });

    toast.success(`${selectedUser.full_name || selectedUser.email} approved as ${selectedRole}`);
    setAssignDialogOpen(false);
    setSelectedUser(null);
    fetchData();
  };

  const openRejectDialog = (u: PendingUser) => {
    setRejectingUser(u);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectingUser) return;

    // Delete user roles
    await supabase.from('user_roles').delete().eq('user_id', rejectingUser.id);
    // Delete store assignments
    await supabase.from('store_assignments').delete().eq('user_id', rejectingUser.id);
    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', rejectingUser.id);

    if (error) {
      toast.error('Failed to reject user');
    } else {
      toast.success(`${rejectingUser.full_name || rejectingUser.email} rejected and removed`);
    }

    setRejectDialogOpen(false);
    setRejectingUser(null);
    fetchData();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h1 className="text-display">Account Approvals</h1>
              <p className="text-muted-foreground text-sm">
                {pendingCount > 0
                  ? `${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}`
                  : 'No pending approvals'}
              </p>
            </div>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="all">All Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">
              {filter === 'pending' ? 'No pending approvals' : 'No users found'}
            </p>
            <p className="text-sm mt-1">
              {filter === 'pending' ? 'All users have been reviewed.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className={cn(
                  "rounded-xl border bg-card p-4 sm:p-5 transition-all",
                  !u.is_approved && "border-warning/30 bg-warning/5"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0",
                      u.is_approved ? "bg-primary/10 text-primary" : "bg-warning/20 text-warning"
                    )}>
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="capitalize">{u.role}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(u.created_at)}</span>
                    </div>
                    {u.stores.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" />
                        <span>{u.stores.map(s => s.name).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Status/Actions */}
                  <div className="flex items-center gap-2">
                    {u.is_approved ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                        <UserCheck className="w-3 h-3 mr-1" />Active
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => handleApprove(u)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openRejectDialog(u)}
                        >
                          <UserX className="w-4 h-4 mr-1" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Store (optional)</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={confirmApprove} className="w-full bg-success hover:bg-success/90">
              <UserCheck className="w-4 h-4 mr-2" />Confirm Approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectingUser?.full_name || rejectingUser?.email}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will remove the user's account. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g., Not a recognized employee"
              />
            </div>
            <Button variant="destructive" onClick={confirmReject} className="w-full">
              <UserX className="w-4 h-4 mr-2" />Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
