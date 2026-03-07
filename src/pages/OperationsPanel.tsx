import { useEffect, useState } from 'react';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { Clock, AlertTriangle, Store, Package, TrendingDown, ArrowRight, DollarSign, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import StockRequests from '@/pages/operations/StockRequests';
import InventoryManagement from '@/pages/operations/InventoryManagement';
import CatalogueManager from '@/pages/operations/CatalogueManager';
import FinanceSettings from '@/pages/operations/FinanceSettings';
import FinanceAuditLog from '@/pages/operations/FinanceAuditLog';
import Reports from '@/pages/operations/Reports';

interface StockRequest {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  store: { name: string };
  cigar: { name: string };
  requester: { full_name: string };
}

interface CriticalItem {
  id: string;
  quantity: number;
  min_stock_level: number;
  store: { name: string };
  cigar: { name: string };
}

export default function OperationsPanel() {
  const [stats, setStats] = useState({ 
    pendingRequests: 0, 
    criticalStock: 0, 
    lowStock: 0,
    activeStores: 0,
    totalProducts: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [recentRequests, setRecentRequests] = useState<StockRequest[]>([]);
  const [criticalItems, setCriticalItems] = useState<CriticalItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<CriticalItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const [requestsRes, inventoryRes, storesRes, cigarsRes, recentReqRes] = await Promise.all([
      supabase.from('stock_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('store_inventory').select(`
        id, quantity, min_stock_level,
        store:stores(name),
        cigar:cigars(name)
      `),
      supabase.from('stores').select('id', { count: 'exact' }),
      supabase.from('cigars').select('id', { count: 'exact' }),
      supabase.from('stock_requests').select(`
        id, quantity, status, created_at,
        store:stores(name),
        cigar:cigars(name),
        requester:profiles!stock_requests_requested_by_fkey(full_name)
      `).order('created_at', { ascending: false }).limit(5)
    ]);
    
    const inventory = inventoryRes.data || [];
    const critical = inventory.filter(i => i.quantity === 0);
    const low = inventory.filter(i => i.quantity > 0 && i.quantity < (i.min_stock_level || 10));
    
    setCriticalItems(critical as unknown as CriticalItem[]);
    setLowStockItems(low as unknown as CriticalItem[]);
    setRecentRequests((recentReqRes.data as unknown as StockRequest[]) || []);
    
    setStats({
      pendingRequests: requestsRes.count || 0,
      criticalStock: critical.length,
      lowStock: low.length,
      activeStores: storesRes.count || 0,
      totalProducts: cigarsRes.count || 0
    });
  };

  const statCards = [
    { icon: Clock, label: 'Pending Requests', value: stats.pendingRequests, subtitle: 'Awaiting approval', color: 'text-warning', bgColor: 'bg-warning/10' },
    { icon: AlertTriangle, label: 'Out of Stock', value: stats.criticalStock, subtitle: 'Critical items', color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { icon: TrendingDown, label: 'Low Stock', value: stats.lowStock, subtitle: 'Below minimum', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { icon: Store, label: 'Active Stores', value: stats.activeStores, subtitle: 'Operational', color: 'text-primary', bgColor: 'bg-primary/10' },
    { icon: Package, label: 'Total Products', value: stats.totalProducts, subtitle: 'In catalogue', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-600';
      case 'approved': return 'bg-green-500/20 text-green-600';
      case 'rejected': return 'bg-red-500/20 text-red-600';
      case 'fulfilled': return 'bg-blue-500/20 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-display">Operations Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage inventory, stock requests, and catalogue across all stores</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">Stock Requests</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="catalogue">Catalogue Manager</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="finance">Finance Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Recent Stock Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Recent Stock Requests</h3>
                    <p className="text-sm text-muted-foreground">Latest requests from sales team</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('requests')}>
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                {recentRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No pending requests</div>
                ) : (
                  <div className="space-y-3">
                    {recentRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{req.cigar?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {req.store?.name} • {req.quantity} units • by {req.requester?.full_name || 'Unknown'}
                          </p>
                        </div>
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(req.status))}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Critical Stock Alert */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Out of Stock Alert
                    </h3>
                    <p className="text-sm text-muted-foreground">Items with zero inventory</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('inventory')}>
                    Manage <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                {criticalItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">All items in stock</div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {criticalItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div>
                          <p className="font-medium text-sm">{item.cigar?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{item.store?.name}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                          Out of Stock
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-orange-500 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Low Stock Warning
                  </h3>
                  <p className="text-sm text-muted-foreground">Items below minimum stock level</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('inventory')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">All items above minimum levels</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.slice(0, 6).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div>
                        <p className="font-medium text-sm">{item.cigar?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{item.store?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-500">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">/ {item.min_stock_level || 10}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setActiveTab('requests')}
                className="quick-action-btn text-left p-4 h-auto flex-col items-start"
              >
                <Clock className="w-6 h-6 text-warning mb-2" />
                <p className="font-medium">Review Requests</p>
                <p className="text-xs text-muted-foreground">{stats.pendingRequests} pending</p>
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className="quick-action-btn text-left p-4 h-auto flex-col items-start"
              >
                <Package className="w-6 h-6 text-primary mb-2" />
                <p className="font-medium">Manage Inventory</p>
                <p className="text-xs text-muted-foreground">{stats.activeStores} stores</p>
              </button>
              <button 
                onClick={() => setActiveTab('catalogue')}
                className="quick-action-btn text-left p-4 h-auto flex-col items-start"
              >
                <Store className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="font-medium">Update Catalogue</p>
                <p className="text-xs text-muted-foreground">{stats.totalProducts} products</p>
              </button>
            </div>
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            <StockRequests />
          </TabsContent>
          <TabsContent value="inventory" className="mt-6">
            <InventoryManagement />
          </TabsContent>
          <TabsContent value="catalogue" className="mt-6">
            <CatalogueManager />
          </TabsContent>
          <TabsContent value="reports" className="mt-6">
            <Reports />
          </TabsContent>
          <TabsContent value="finance" className="mt-6">
            <FinanceSettings />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <FinanceAuditLog />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
