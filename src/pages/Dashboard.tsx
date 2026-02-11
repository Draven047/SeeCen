import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { IndianRupee, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { StatCard } from '@/components/ui/stat-card';

interface Stats {
  totalSales: number;
  totalOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
}

const dummySalesData = [
  { month: 'Jul', sales: 0 },
  { month: 'Aug', sales: 0 },
  { month: 'Sep', sales: 0 },
  { month: 'Oct', sales: 0 },
  { month: 'Nov', sales: 0 },
  { month: 'Dec', sales: 0 },
];

const dummyDistributionData = [
  { name: 'Tops & Shirts', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'Dresses', value: 30, color: 'hsl(var(--chart-5))' },
  { name: 'Accessories', value: 25, color: 'hsl(var(--chart-6))' },
];

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalOrders: 0,
    activeCustomers: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, customersRes] = await Promise.all([
        supabase.from('orders').select('total'),
        supabase.from('customers').select('id', { count: 'exact' })
      ]);

      const orders = ordersRes.data || [];
      const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrder = orders.length > 0 ? totalSales / orders.length : 0;

      setStats({
        totalSales,
        totalOrders: orders.length,
        activeCustomers: customersRes.count || 0,
        avgOrderValue: avgOrder
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-display">
            {role === 'admin' ? 'Seller Dashboard' : role === 'manager' ? 'Store Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your business performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Sales"
            value={loading ? '...' : formatCurrency(stats.totalSales)}
            changeLabel="This quarter"
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <StatCard
            title="Total Orders"
            value={loading ? '...' : stats.totalOrders.toString()}
            changeLabel="This quarter"
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <StatCard
            title="Active Customers"
            value={loading ? '...' : stats.activeCustomers.toString()}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Avg Order Value"
            value={loading ? '...' : formatCurrency(stats.avgOrderValue)}
            variant="primary"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-heading">Sales Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly sales performance</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v/100000}L`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Distribution */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-heading">Product Distribution</h3>
              <p className="text-sm text-muted-foreground">Sales by product category</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dummyDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dummyDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {dummyDistributionData.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
