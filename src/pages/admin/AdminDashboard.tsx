import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Package, TrendingUp } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalStores: number;
  totalCigars: number;
  totalSales: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStores: 0,
    totalCigars: 0,
    totalSales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, storesRes, cigarsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('stores').select('id', { count: 'exact' }),
        supabase.from('cigars').select('id', { count: 'exact' }),
        supabase.from('orders').select('total')
      ]);

      const totalSales = ordersRes.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalStores: storesRes.count || 0,
        totalCigars: cigarsRes.count || 0,
        totalSales: totalSales
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'text-primary' },
    { icon: Store, label: 'Stores', value: stats.totalStores, color: 'text-success' },
    { icon: Package, label: 'Cigars', value: stats.totalCigars, color: 'text-warning' },
    { icon: TrendingUp, label: 'Total Sales', value: `$${stats.totalSales.toLocaleString()}`, color: 'text-chart-5' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your business from here</p>
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
