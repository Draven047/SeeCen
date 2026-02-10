import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ShoppingCart, DollarSign, CheckCircle, Download, RefreshCw, Search, Filter, Eye, Lock, Ban, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface Order {
  id: string;
  order_number: string;
  invoice_number: string | null;
  status: 'created' | 'paid' | 'shipped' | 'delivered';
  is_finalized: boolean;
  is_voided: boolean;
  total: number;
  created_at: string;
  created_by: string;
  customers: { name: string } | null;
}

export default function Orders() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [activeTab, user]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, order_number, invoice_number, status, is_finalized, is_voided, total, created_at, created_by, customers(name)')
      .order('created_at', { ascending: false });
    
    if (activeTab === 'my' && user) {
      query = query.eq('created_by', user.id);
    }
    
    const { data } = await query;
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  const filtered = orders.filter(order => {
    const matchSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.customers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const myOrders = orders.filter(o => o.created_by === user?.id);
  const totalRevenue = myOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const deliveredCount = myOrders.filter(o => o.status === 'delivered').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const statusClass = (status: string) => {
    if (status === 'created') return 'status-created';
    if (status === 'paid') return 'status-paid';
    if (status === 'shipped') return 'status-shipped';
    return 'status-delivered';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Order History</h1>
            <p className="text-muted-foreground text-sm mt-1">View and manage order history</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchOrders} className="btn-outline-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger 
                value="my" 
                className="px-8 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                My Orders
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="px-8 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                All Orders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="my" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">My Orders</p>
                    <p className="text-2xl font-bold mt-1">{myOrders.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Your orders</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Your total sales</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-success" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold mt-1">{deliveredCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-card">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Search & Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders, customers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time Period</Label>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearch(''); setStatusFilter('all'); setTimeFilter('all'); }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">My Orders</h3>
                <p className="text-sm text-muted-foreground">Your order history and current status</p>
              </div>
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold">No orders found</h3>
                  <p className="text-sm text-muted-foreground mt-1">You haven't created any orders yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr 
                        key={order.id} 
                        className="table-row-hover border-t border-border cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{order.invoice_number || order.order_number}</span>
                            {order.is_finalized && <Lock className="w-3 h-3 text-muted-foreground" />}
                            {order.is_voided && <Ban className="w-3 h-3 text-destructive" />}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{order.customers?.name || 'N/A'}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="p-4">
                          <span className={cn('status-badge capitalize', statusClass(order.status), order.is_voided && 'opacity-50')}>
                            {order.is_voided ? 'Voided' : order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(Number(order.total))}</td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {/* Same content structure for All Orders tab */}
            <div className="filter-card">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Search & Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders, customers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time Period</Label>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearch(''); setStatusFilter('all'); setTimeFilter('all'); }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">All Orders</h3>
                <p className="text-sm text-muted-foreground">Complete order history from all users</p>
              </div>
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold">No orders found</h3>
                  <p className="text-sm text-muted-foreground mt-1">No orders have been created yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr 
                        key={order.id} 
                        className="table-row-hover border-t border-border cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{order.invoice_number || order.order_number}</span>
                            {order.is_finalized && <Lock className="w-3 h-3 text-muted-foreground" />}
                            {order.is_voided && <Ban className="w-3 h-3 text-destructive" />}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{order.customers?.name || 'N/A'}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="p-4">
                          <span className={cn('status-badge capitalize', statusClass(order.status), order.is_voided && 'opacity-50')}>
                            {order.is_voided ? 'Voided' : order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(Number(order.total))}</td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
