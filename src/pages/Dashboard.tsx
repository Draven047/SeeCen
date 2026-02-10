import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, ShoppingCart, Users, TrendingUp, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

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
  { name: 'Premium Cigars', value: 60, color: 'hsl(28, 85%, 52%)' },
  { name: 'Limited Edition', value: 25, color: 'hsl(220, 70%, 55%)' },
  { name: 'Accessories', value: 15, color: 'hsl(280, 60%, 55%)' },
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

  const statCards = [
    { 
      icon: DollarSign, 
      label: 'Total Sales', 
      value: formatCurrency(stats.totalSales), 
      subtitle: 'This quarter',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    { 
      icon: ShoppingCart, 
      label: 'Total Orders', 
      value: stats.totalOrders.toString(), 
      subtitle: 'This quarter',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground'
    },
    { 
      icon: Users, 
      label: 'Active Customers', 
      value: stats.activeCustomers.toString(), 
      subtitle: 'Active this quarter',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground'
    },
    { 
      icon: TrendingUp, 
      label: 'Avg Order Value', 
      value: formatCurrency(stats.avgOrderValue), 
      subtitle: 'Per order',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {role === 'admin' ? 'Admin Dashboard' : 'Sales Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of your business performance and team management
            </p>
          </div>
          <button className="flex items-center gap-2 text-primary text-sm font-medium hover:underline">
            <Sparkles className="w-4 h-4" />
            Core Features
          </button>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="glass-card p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Sales Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly sales performance across all stores</p>
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
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Distribution */}
          <div className="glass-card p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Product Distribution</h3>
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
                      borderRadius: '8px'
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
