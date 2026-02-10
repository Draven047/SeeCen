import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Store, AlertTriangle, ClipboardList } from 'lucide-react';

interface Stats {
  totalStores: number;
  lowStockItems: number;
  pendingRequests: number;
  totalProducts: number;
}

export default function OperationsDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStores: 0,
    lowStockItems: 0,
    pendingRequests: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [storesRes, lowStockRes, requestsRes, productsRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact' }),
        supabase.from('store_inventory').select('id', { count: 'exact' }).lt('quantity', 10),
        supabase.from('stock_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('cigars').select('id', { count: 'exact' })
      ]);

      setStats({
        totalStores: storesRes.count || 0,
        lowStockItems: lowStockRes.count || 0,
        pendingRequests: requestsRes.count || 0,
        totalProducts: productsRes.count || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { icon: Store, label: 'Stores', value: stats.totalStores, color: 'text-primary' },
    { icon: Package, label: 'Products', value: stats.totalProducts, color: 'text-success' },
    { icon: AlertTriangle, label: 'Low Stock Items', value: stats.lowStockItems, color: 'text-warning' },
    { icon: ClipboardList, label: 'Pending Requests', value: stats.pendingRequests, color: 'text-chart-5' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage inventory and stock requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
