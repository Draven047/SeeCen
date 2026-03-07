import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import {
  ShoppingCart, IndianRupee, TrendingUp, Package, Users, BarChart3,
  RotateCcw, Settings, UserCog, MessageSquareWarning, Bot, Truck,
  Link2, Store, Boxes, ChevronRight,
} from 'lucide-react';

interface TodayStats {
  totalSales: number;
  totalOrders: number;
  liveOrders: number;
}

const quickLinks = [
  { icon: ShoppingCart, label: 'Order History', path: '/orders', color: 'bg-primary/10 text-primary' },
  { icon: MessageSquareWarning, label: 'Complaints', path: '/feedback', color: 'bg-warning/10 text-warning' },
  { icon: RotateCcw, label: 'Returns', path: '/returns', color: 'bg-destructive/10 text-destructive' },
  { icon: UserCog, label: 'Manage Staff', path: '/employees', color: 'bg-info/10 text-info' },
  { icon: Settings, label: 'Store Settings', path: '/settings', color: 'bg-muted text-muted-foreground' },
  { icon: Users, label: 'Customers', path: '/customers', color: 'bg-success/10 text-success' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', color: 'bg-primary/10 text-primary' },
  { icon: Bot, label: 'AI Coach', path: '/ai-coach', color: 'bg-accent text-accent-foreground' },
];

const insightCards = [
  { title: 'Sales Overview', desc: 'Revenue trends and performance', icon: TrendingUp, path: '/analytics' },
  { title: 'Order Funnel', desc: 'Conversion & fulfillment rates', icon: ShoppingCart, path: '/analytics' },
  { title: 'Inventory Health', desc: 'Stock levels & availability', icon: Boxes, path: '/inventory' },
  { title: 'Customer Insights', desc: 'Repeat buyers & segments', icon: Users, path: '/customers' },
];

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [stats, setStats] = useState<TodayStats>({ totalSales: 0, totalOrders: 0, liveOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentStore) { setLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];

      const { data: orders } = await supabase
        .from('orders')
        .select('total, fulfillment_status')
        .eq('store_id', currentStore.id)
        .gte('created_at', today);

      const totalOrders = orders?.length || 0;
      const totalSales = orders?.reduce((s, o) => s + Number(o.total), 0) || 0;
      const liveOrders = orders?.filter(o =>
        !['delivered', 'fulfilled', 'cancelled', 'declined'].includes(o.fulfillment_status)
      ).length || 0;

      setStats({ totalSales, totalOrders, liveOrders });
      setLoading(false);
    };
    fetchStats();
  }, [currentStore]);

  return (
    <SellerOSLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Today So Far */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Today so far</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium">Sales</p>
              <p className="text-xl font-bold text-foreground mt-1">
                ₹{stats.totalSales.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium">Orders</p>
              <p className="text-xl font-bold text-foreground mt-1">{stats.totalOrders}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium">Live</p>
              <p className="text-xl font-bold text-success mt-1">{stats.liveOrders}</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Quick links</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.path + link.label}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors min-h-[80px] justify-center"
              >
                <div className={`w-10 h-10 rounded-full ${link.color} flex items-center justify-center`}>
                  <link.icon className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[11px] font-medium text-foreground text-center leading-tight">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Business Insights */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Business insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insightCards.map((card) => (
              <button
                key={card.title}
                onClick={() => navigate(card.path)}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </SellerOSLayout>
  );
}
