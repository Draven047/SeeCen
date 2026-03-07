import { useEffect, useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, Store, Users, TrendingUp, Download, BarChart3, 
  Plus, Edit, Trash2, MapPin, Phone, Award, Target, UserCheck,
  ArrowUpRight, ArrowDownRight, Building2, ChevronRight, Flame,
  Settings, History, Gift, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'sales' | 'operations';
  is_approved: boolean;
  stores: { id: string; name: string }[];
  totalSales: number;
  ordersCount: number;
  customersCount: number;
  joinedAt: string;
}

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  revenue: number;
  ordersCount: number;
  employeesCount: number;
}

interface FumePointsSettings {
  id: string;
  points_per_amount: number;
  point_value: number;
  min_redeem_points: number;
  expiry_months: number | null;
  is_active: boolean;
}

interface FumePointsLedger {
  id: string;
  customer_id: string;
  customer_name?: string;
  points: number;
  type: string;
  reason: string | null;
  created_at: string;
}

interface CustomerWithPoints {
  id: string;
  name: string;
  phone: string | null;
  fume_points_balance: number;
}

export default function AdminPanel() {
  const [stats, setStats] = useState({ totalRevenue: 0, totalStores: 0, totalTeam: 0, totalOrders: 0 });
  const [stores, setStores] = useState<StoreData[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; target: number }[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Store management
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [storeForm, setStoreForm] = useState({ name: '', address: '', phone: '' });
  
  // Store comparison
  const [compareStore1, setCompareStore1] = useState<string>('');
  const [compareStore2, setCompareStore2] = useState<string>('');
  
  // Team management
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | 'pending' | 'active'>('all');

  // Fume Points
  const [fumeSettings, setFumeSettings] = useState<FumePointsSettings | null>(null);
  const [fumeLedger, setFumeLedger] = useState<FumePointsLedger[]>([]);
  const [customersWithPoints, setCustomersWithPoints] = useState<CustomerWithPoints[]>([]);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustCustomer, setAdjustCustomer] = useState<CustomerWithPoints | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    const [ordersRes, storesRes, profilesRes, rolesRes, assignmentsRes, customersRes, fumeSettingsRes, fumeLedgerRes] = await Promise.all([
      supabase.from('orders').select('id, total, created_by, store_id, created_at'),
      supabase.from('stores').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('store_assignments').select('user_id, store_id, stores(id, name)'),
      supabase.from('customers').select('id, name, phone, created_by, fume_points_balance'),
      supabase.from('fume_points_settings').select('*').limit(1).maybeSingle(),
      supabase.from('fume_points_ledger').select('*').order('created_at', { ascending: false }).limit(50)
    ]);

    const orders = ordersRes.data || [];
    const allStores = storesRes.data || [];
    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const assignments = assignmentsRes.data || [];
    const customers = customersRes.data || [];

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

    // Calculate store-wise data
    const storesWithStats: StoreData[] = allStores.map(store => {
      const storeOrders = orders.filter(o => o.store_id === store.id);
      const storeAssignments = assignments.filter(a => a.store_id === store.id);
      return {
        ...store,
        revenue: storeOrders.reduce((sum, o) => sum + Number(o.total), 0),
        ordersCount: storeOrders.length,
        employeesCount: storeAssignments.length
      };
    });

    // Calculate team member data
    const teamWithStats: TeamMember[] = profiles.map(p => {
      const userRole = roles.find(r => r.user_id === p.id);
      const userStores = assignments
        .filter(a => a.user_id === p.id)
        .map(a => a.stores as unknown as { id: string; name: string })
        .filter(Boolean);
      const userOrders = orders.filter(o => o.created_by === p.id);
      const userCustomers = customers.filter(c => c.created_by === p.id);

      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: (userRole?.role || 'sales') as 'admin' | 'sales' | 'operations',
        is_approved: userRole?.is_approved ?? false,
        stores: userStores,
        totalSales: userOrders.reduce((sum, o) => sum + Number(o.total), 0),
        ordersCount: userOrders.length,
        customersCount: userCustomers.length,
        joinedAt: p.created_at
      };
    });

    // Generate revenue trend data (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthOrders = orders.filter(o => {
        const orderMonth = new Date(o.created_at).getMonth();
        return orderMonth === monthIndex;
      });
      revenueTrend.push({
        month: months[monthIndex],
        revenue: monthOrders.reduce((sum, o) => sum + Number(o.total), 0),
        target: 500000 // Example target
      });
    }

    // Fume points data
    if (fumeSettingsRes.data) {
      setFumeSettings(fumeSettingsRes.data as FumePointsSettings);
    }
    
    // Customers with points balance > 0
    const custWithPoints = customers
      .filter(c => (c.fume_points_balance || 0) > 0)
      .map(c => ({ id: c.id, name: c.name, phone: c.phone, fume_points_balance: c.fume_points_balance || 0 }))
      .sort((a, b) => b.fume_points_balance - a.fume_points_balance);
    setCustomersWithPoints(custWithPoints);
    
    // Ledger with customer names
    const ledgerWithNames = (fumeLedgerRes.data || []).map(entry => {
      const cust = customers.find(c => c.id === entry.customer_id);
      return { ...entry, customer_name: cust?.name || 'Unknown' };
    });
    setFumeLedger(ledgerWithNames);

    setStats({
      totalRevenue,
      totalStores: allStores.length,
      totalTeam: profiles.length,
      totalOrders: orders.length
    });
    setStores(storesWithStats);
    setTeam(teamWithStats);
    setRevenueData(revenueTrend);
    setLoading(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  // Store management functions
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      const { error } = await supabase.from('stores').update(storeForm).eq('id', editingStore.id);
      if (error) toast.error('Failed to update store');
      else { toast.success('Store updated!'); resetStoreForm(); fetchAllData(); }
    } else {
      const { error } = await supabase.from('stores').insert(storeForm);
      if (error) toast.error('Failed to add store');
      else { toast.success('Store added!'); resetStoreForm(); fetchAllData(); }
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm('Are you sure? This will also remove all employee assignments.')) return;
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) toast.error('Failed to delete store');
    else { toast.success('Store deleted'); fetchAllData(); }
  };

  const resetStoreForm = () => {
    setStoreForm({ name: '', address: '', phone: '' });
    setEditingStore(null);
    setStoreDialogOpen(false);
  };

  const openEditStore = (store: StoreData) => {
    setEditingStore(store);
    setStoreForm({ name: store.name, address: store.address || '', phone: store.phone || '' });
    setStoreDialogOpen(true);
  };

  // Team management functions
  const updateUserRole = async (userId: string, newRole: 'admin' | 'sales' | 'operations') => {
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) toast.error('Failed to update role');
    else { toast.success('Role updated'); fetchAllData(); }
  };

  const approveUser = async (userId: string) => {
    const { error } = await supabase.from('user_roles').update({ is_approved: true }).eq('user_id', userId);
    if (error) toast.error('Failed to approve user');
    else { toast.success('User approved'); fetchAllData(); }
  };

  const rejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? Their account will be deleted.')) return;
    // Delete user roles first
    await supabase.from('user_roles').delete().eq('user_id', userId);
    // Delete store assignments
    await supabase.from('store_assignments').delete().eq('user_id', userId);
    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) toast.error('Failed to reject user');
    else { toast.success('User rejected and removed'); fetchAllData(); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    // Delete user roles first
    await supabase.from('user_roles').delete().eq('user_id', userId);
    // Delete store assignments
    await supabase.from('store_assignments').delete().eq('user_id', userId);
    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) toast.error('Failed to delete user');
    else { toast.success('User deleted'); fetchAllData(); }
  };

  const assignToStore = async () => {
    if (!selectedMember || !selectedStore) return;
    const { error } = await supabase.from('store_assignments').insert({
      user_id: selectedMember.id,
      store_id: selectedStore
    });
    if (error?.code === '23505') toast.error('Already assigned to this store');
    else if (error) toast.error('Failed to assign');
    else { toast.success('Assigned successfully'); setAssignDialogOpen(false); setSelectedStore(''); fetchAllData(); }
  };

  const removeFromStore = async (userId: string, storeId: string) => {
    const { error } = await supabase.from('store_assignments').delete().eq('user_id', userId).eq('store_id', storeId);
    if (error) toast.error('Failed to remove');
    else { toast.success('Removed from store'); fetchAllData(); }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/20 text-destructive',
    operations: 'bg-info/20 text-info',
    sales: 'bg-success/20 text-success'
  };

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))'];

  // Get comparison data
  const store1Data = stores.find(s => s.id === compareStore1);
  const store2Data = stores.find(s => s.id === compareStore2);

  const comparisonData = store1Data && store2Data ? [
    { metric: 'Revenue', store1: store1Data.revenue, store2: store2Data.revenue },
    { metric: 'Orders', store1: store1Data.ordersCount * 10000, store2: store2Data.ordersCount * 10000 },
    { metric: 'Team', store1: store1Data.employeesCount * 50000, store2: store2Data.employeesCount * 50000 }
  ] : [];

  // Top performers (sales role only)
  const topPerformers = team
    .filter(m => m.role === 'sales')
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  // Fume Points functions
  const updateFumeSettings = async (updates: Partial<FumePointsSettings>) => {
    if (!fumeSettings) return;
    const { error } = await supabase.from('fume_points_settings').update(updates).eq('id', fumeSettings.id);
    if (error) toast.error('Failed to update settings');
    else { toast.success('Settings updated'); fetchAllData(); }
  };

  const handleManualAdjust = async () => {
    if (!adjustCustomer || !adjustPoints || !adjustReason.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) {
      toast.error('Invalid points amount');
      return;
    }

    const actualPoints = adjustType === 'deduct' ? -points : points;
    const newBalance = adjustCustomer.fume_points_balance + actualPoints;

    if (newBalance < 0) {
      toast.error('Cannot deduct more than current balance');
      return;
    }

    // Create ledger entry
    const { error: ledgerError } = await supabase.from('fume_points_ledger').insert({
      customer_id: adjustCustomer.id,
      points: actualPoints,
      type: adjustType === 'add' ? 'manual_add' : 'manual_deduct',
      reason: adjustReason,
      created_by: null // admin action
    });

    if (ledgerError) {
      toast.error('Failed to create ledger entry');
      return;
    }

    // Update customer balance
    const { error: custError } = await supabase
      .from('customers')
      .update({ fume_points_balance: newBalance })
      .eq('id', adjustCustomer.id);

    if (custError) {
      toast.error('Failed to update balance');
      return;
    }

    toast.success(`${adjustType === 'add' ? 'Added' : 'Deducted'} ${points} points`);
    setAdjustDialogOpen(false);
    setAdjustCustomer(null);
    setAdjustPoints('');
    setAdjustReason('');
    fetchAllData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-display">Business Command Center</h1>
              <p className="text-muted-foreground text-sm">Complete oversight of your cigar empire</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), trend: '+12.5%', up: true, color: 'text-success' },
            { icon: Store, label: 'Active Stores', value: stats.totalStores, trend: `${stats.totalStores} locations`, up: true, color: 'text-primary' },
            { icon: Users, label: 'Team Members', value: stats.totalTeam, trend: 'Across all roles', up: true, color: 'text-info' },
            { icon: TrendingUp, label: 'Total Orders', value: stats.totalOrders, trend: 'All time', up: true, color: 'text-warning' },
          ].map((stat, i) => (
            <div key={i} className="stat-card group hover:border-primary/50 transition-all">
              <div className="flex items-start justify-between">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${stat.color.split('-')[1]}/10`)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                {stat.up ? (
                  <span className="flex items-center text-xs font-medium text-success">
                    <ArrowUpRight className="w-3 h-3" />{stat.trend}
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-medium text-destructive">
                    <ArrowDownRight className="w-3 h-3" />{stat.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold mt-3">{loading ? '...' : stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team Management</TabsTrigger>
            <TabsTrigger value="stores">Store Analytics</TabsTrigger>
            <TabsTrigger value="insights">Sales Insights</TabsTrigger>
            <TabsTrigger value="fume" className="flex items-center gap-1">
              <Flame className="w-4 h-4" />Fume Points
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend */}
              <div className="lg:col-span-2 glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Revenue Trend</h3>
                    <p className="text-sm text-muted-foreground">Monthly performance vs targets</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v/100000}L`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} 
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} name="Revenue" />
                      <Area type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1} strokeDasharray="5 5" name="Target" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {topPerformers.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No sales data yet</p>
                  ) : (
                    topPerformers.map((member, i) => (
                      <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          i === 0 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                        )}>
                          {i === 0 ? <Award className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.full_name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.ordersCount} orders</p>
                        </div>
                        <p className="font-semibold text-sm">{formatCurrency(member.totalSales)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Store Overview Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Store Performance</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('stores')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stores.map((store) => (
                  <div key={store.id} className="glass-card p-4 hover:border-primary/50 transition-all cursor-pointer" onClick={() => setActiveTab('stores')}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{store.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{store.address || 'No address'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Revenue</p>
                        <p className="font-semibold">{formatCurrency(store.revenue)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Team</p>
                        <p className="font-semibold">{store.employeesCount} members</p>
                      </div>
                    </div>
                  </div>
                ))}
                {stores.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No stores configured. Add your first store in Store Analytics.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6 mt-6">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Team Directory</h3>
                  <p className="text-sm text-muted-foreground">Manage roles, assignments & track performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as any)}>
                    <SelectTrigger className="w-40 bg-input">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Stores</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : team.filter(m => {
                    if (teamFilter === 'pending') return !m.is_approved;
                    if (teamFilter === 'active') return m.is_approved;
                    return true;
                  }).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {teamFilter === 'pending' ? 'No pending approvals' : teamFilter === 'active' ? 'No active members' : 'No team members found'}
                    </TableCell></TableRow>
                  ) : (
                    team.filter(m => {
                      if (teamFilter === 'pending') return !m.is_approved;
                      if (teamFilter === 'active') return m.is_approved;
                      return true;
                    }).map(member => (
                      <TableRow key={member.id} className={!member.is_approved ? 'bg-warning/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                              {(member.full_name || member.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{member.full_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.is_approved ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-success/20 text-success">
                              <UserCheck className="w-3 h-3 mr-1" />Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-warning/20 text-warning">
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select value={member.role} onValueChange={(v) => updateUserRole(member.id, v as any)} disabled={!member.is_approved}>
                            <SelectTrigger className={cn("w-28", roleColors[member.role])}>
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
                          <div className="flex flex-wrap gap-1">
                            {member.stores.map(store => (
                              <span key={store.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
                                {store.name}
                                <button onClick={() => removeFromStore(member.id, store.id)} className="hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            {member.stores.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(member.totalSales)}</TableCell>
                        <TableCell className="text-right">{member.ordersCount}</TableCell>
                        <TableCell className="text-right">{member.customersCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!member.is_approved ? (
                              <>
                                <Button variant="default" size="sm" className="bg-success hover:bg-success/90" onClick={() => approveUser(member.id)}>
                                  <UserCheck className="w-4 h-4 mr-1" />Approve
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => rejectUser(member.id)}>
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedMember(member); setAssignDialogOpen(true); }}>
                                  <Plus className="w-4 h-4 mr-1" />Store
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteUser(member.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Team Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold">{team.filter(m => m.role === 'admin').length}</p>
                    <p className="text-sm text-muted-foreground">Administrators</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold">{team.filter(m => m.role === 'sales').length}</p>
                    <p className="text-sm text-muted-foreground">Sales Team</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="font-semibold">{team.filter(m => m.role === 'operations').length}</p>
                    <p className="text-sm text-muted-foreground">Operations Team</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Store Analytics Tab */}
          <TabsContent value="stores" className="space-y-6 mt-6">
            {/* Store Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Store Management</h3>
                <p className="text-sm text-muted-foreground">Add, edit, compare and analyze store performance</p>
              </div>
              <Dialog open={storeDialogOpen} onOpenChange={(open) => { setStoreDialogOpen(open); if (!open) resetStoreForm(); }}>
                <DialogTrigger asChild>
                  <Button className="btn-primary"><Plus className="w-4 h-4 mr-2" />Add Store</Button>
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader>
                    <DialogTitle className="font-display">{editingStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStoreSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Store Name *</Label>
                      <Input value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} required className="bg-input" placeholder="Store name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} className="bg-input" placeholder="Full address" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={storeForm.phone} onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })} className="bg-input" placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <Button type="submit" className="w-full btn-primary">{editingStore ? 'Update Store' : 'Add Store'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Store Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => (
                <div key={store.id} className="glass-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{store.name}</h4>
                        {store.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{store.address}
                          </p>
                        )}
                        {store.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{store.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditStore(store)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteStore(store.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{formatCurrency(store.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{store.ordersCount}</p>
                      <p className="text-xs text-muted-foreground">Orders</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{store.employeesCount}</p>
                      <p className="text-xs text-muted-foreground">Team</p>
                    </div>
                  </div>
                </div>
              ))}
              {stores.length === 0 && (
                <div className="col-span-full glass-card p-8 text-center text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stores configured yet</p>
                  <p className="text-sm">Add your first store to get started</p>
                </div>
              )}
            </div>

            {/* Store Comparison */}
            {stores.length >= 2 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Compare Stores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Select value={compareStore1} onValueChange={setCompareStore1}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="Select first store" /></SelectTrigger>
                    <SelectContent>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-center text-muted-foreground font-semibold">VS</div>
                  <Select value={compareStore2} onValueChange={setCompareStore2}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="Select second store" /></SelectTrigger>
                    <SelectContent>
                      {stores.filter(s => s.id !== compareStore1).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {store1Data && store2Data && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(v) => `₹${v/100000}L`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis type="category" dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value / (name.includes('Revenue') ? 1 : 10000)), name === 'store1' ? store1Data.name : store2Data.name]} />
                        <Bar dataKey="store1" fill="hsl(var(--primary))" name={store1Data.name} radius={4} />
                        <Bar dataKey="store2" fill="hsl(var(--info))" name={store2Data.name} radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Sales Insights Tab */}
          <TabsContent value="insights" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leaderboard */}
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Sales Leaderboard</h3>
                <div className="space-y-3">
                  {topPerformers.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No sales data available</p>
                  ) : (
                    topPerformers.map((member, i) => (
                      <div key={member.id} className={cn(
                        "flex items-center gap-4 p-4 rounded-lg",
                        i === 0 ? "bg-warning/10 border border-warning/30" : "bg-muted/30"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                          i === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {i === 0 ? <Award className="w-5 h-5" /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{member.full_name || member.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.ordersCount} orders • {member.customersCount} customers
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(member.totalSales)}</p>
                          <p className="text-xs text-muted-foreground">Total Sales</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Role Distribution */}
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Team Composition</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Sales', value: team.filter(m => m.role === 'sales').length },
                          { name: 'Operations', value: team.filter(m => m.role === 'operations').length },
                          { name: 'Admin', value: team.filter(m => m.role === 'admin').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {CHART_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Store-wise Performance */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Store-wise Revenue</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stores.map(s => ({ name: s.name, revenue: s.revenue, orders: s.ordersCount }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v/100000}L`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Fume Points Tab */}
          <TabsContent value="fume" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Program Settings</h3>
                </div>
                {fumeSettings ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Program Active</Label>
                      <Switch checked={fumeSettings.is_active} onCheckedChange={(v) => updateFumeSettings({ is_active: v })} />
                    </div>
                    <div className="space-y-2">
                      <Label>₹ per 1 Point</Label>
                      <Input type="number" value={fumeSettings.points_per_amount} onChange={(e) => updateFumeSettings({ points_per_amount: parseInt(e.target.value) })} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Point Value (₹)</Label>
                      <Input type="number" value={fumeSettings.point_value} onChange={(e) => updateFumeSettings({ point_value: parseFloat(e.target.value) })} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Redeem Points</Label>
                      <Input type="number" value={fumeSettings.min_redeem_points} onChange={(e) => updateFumeSettings({ min_redeem_points: parseInt(e.target.value) })} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry (months, blank = never)</Label>
                      <Input type="number" value={fumeSettings.expiry_months || ''} onChange={(e) => updateFumeSettings({ expiry_months: e.target.value ? parseInt(e.target.value) : null })} className="bg-input" placeholder="No expiry" />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Loading settings...</p>
                )}
              </div>

              {/* Customer Balances */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-warning" />
                  <h3 className="font-semibold">Top Balances</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {customersWithPoints.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No customers with points</p>
                  ) : (
                    customersWithPoints.slice(0, 10).map(cust => (
                      <div key={cust.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{cust.name}</p>
                          <p className="text-xs text-muted-foreground">{cust.phone || 'No phone'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-warning">{cust.fume_points_balance} pts</span>
                          <Button size="sm" variant="ghost" onClick={() => { setAdjustCustomer(cust); setAdjustDialogOpen(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Ledger */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-info" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {fumeLedger.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No activity yet</p>
                  ) : (
                    fumeLedger.slice(0, 15).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{entry.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.type.replace('_', ' ')}</p>
                        </div>
                        <span className={cn("font-semibold text-sm", entry.points > 0 ? "text-success" : "text-destructive")}>
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Store Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Assign {selectedMember?.full_name || selectedMember?.email} to Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="Select store" /></SelectTrigger>
              <SelectContent>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={assignToStore} className="w-full btn-primary" disabled={!selectedStore}>Assign to Store</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Points Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Adjust Points - {adjustCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-warning">{adjustCustomer?.fume_points_balance || 0} pts</p>
            </div>
            <div className="flex gap-2">
              <Button variant={adjustType === 'add' ? 'default' : 'outline'} className="flex-1" onClick={() => setAdjustType('add')}>
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
              <Button variant={adjustType === 'deduct' ? 'default' : 'outline'} className="flex-1" onClick={() => setAdjustType('deduct')}>
                <Minus className="w-4 h-4 mr-1" />Deduct
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min="1" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} className="bg-input" placeholder="Enter points" />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="bg-input" placeholder="Reason for adjustment..." />
            </div>
            <Button onClick={handleManualAdjust} className="w-full btn-primary" disabled={!adjustPoints || !adjustReason.trim()}>
              Confirm Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
