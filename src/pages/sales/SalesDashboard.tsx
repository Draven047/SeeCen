import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Package, Users, ShoppingCart, Target, Cake } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { AICoachDashboardCard } from '@/components/ai-coach/AICoachDashboardCard';

interface Stats {
  totalOrders: number;
  totalCustomers: number;
  quarterSales: number;
  targetAmount: number;
}

interface BirthdayCustomer {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string;
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalCustomers: 0,
    quarterSales: 0,
    targetAmount: 50000
  });
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [ordersRes, customersRes, targetsRes] = await Promise.all([
      supabase.from('orders').select('total', { count: 'exact' }).eq('created_by', user.id),
      supabase.from('customers').select('id, name, phone, date_of_birth').not('date_of_birth', 'is', null),
      supabase.from('sales_targets').select('*').eq('user_id', user.id).single()
    ]);

    const totalSales = ordersRes.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

    setStats({
      totalOrders: ordersRes.count || 0,
      totalCustomers: customersRes.data?.length || 0,
      quarterSales: totalSales,
      targetAmount: targetsRes.data?.target_amount || 50000
    });

    // Find upcoming birthdays (next 7 days)
    const today = new Date();
    const upcoming: BirthdayCustomer[] = [];

    (customersRes.data || []).forEach((customer: any) => {
      if (!customer.date_of_birth) return;

      const dob = parseISO(customer.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

      // Check if birthday is within next 7 days
      for (let i = 0; i <= 7; i++) {
        const checkDate = addDays(today, i);
        if (isSameDay(thisYearBirthday, checkDate)) {
          upcoming.push({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            date_of_birth: customer.date_of_birth
          });
          break;
        }
      }
    });

    setUpcomingBirthdays(upcoming.slice(0, 5));
    setLoading(false);
  };

  const progressPercent = Math.min((stats.quarterSales / stats.targetAmount) * 100, 100);

  const statCards = [
    { icon: ShoppingCart, label: 'My Orders', value: stats.totalOrders, color: 'text-primary' },
    { icon: Users, label: 'Customers', value: stats.totalCustomers, color: 'text-success' },
    { icon: TrendingUp, label: 'My Sales', value: `$${stats.quarterSales.toLocaleString()}`, color: 'text-chart-5' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-display">Sales Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your performance and customers</p>
        </div>

        {/* AI Coach Daily Summary Card */}
        <AICoachDashboardCard />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-heading">Quarter Target Progress</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress to ${stats.targetAmount.toLocaleString()}</span>
                <span className="font-medium text-primary">{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                ${stats.quarterSales.toLocaleString()} of ${stats.targetAmount.toLocaleString()} achieved
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Cake className="w-6 h-6 text-primary" />
              <h2 className="text-heading">Upcoming Birthdays</h2>
            </div>
            {upcomingBirthdays.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming birthdays in the next 7 days</p>
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.map(customer => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(customer.date_of_birth), 'MMMM d')}
                      </p>
                    </div>
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        className="inline-flex min-h-8 items-center rounded-full px-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        {customer.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
