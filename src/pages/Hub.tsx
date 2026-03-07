import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerOSLayout } from '@/components/layout/SellerOSLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ShoppingCart, IndianRupee, TrendingUp, Package, Users, BarChart3,
  RotateCcw, Settings, UserCog, MessageSquareWarning, Bot, Truck,
  ChevronRight, Boxes, CircleDot, ArrowUpRight, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayStats {
  totalSales: number;
  totalOrders: number;
  liveOrders: number;
  avgOrderValue: number;
}

const quickLinks = [
  { icon: ShoppingCart, label: 'Orders', path: '/orders', color: 'bg-primary/10 text-primary' },
  { icon: Boxes, label: 'Inventory', path: '/inventory', color: 'bg-success/10 text-success' },
  { icon: IndianRupee, label: 'Finance', path: '/finance', color: 'bg-warning/10 text-warning' },
  { icon: MessageSquareWarning, label: 'Feedback', path: '/feedback', color: 'bg-destructive/10 text-destructive' },
  { icon: RotateCcw, label: 'Returns', path: '/returns', color: 'bg-info/10 text-info' },
  { icon: Users, label: 'Customers', path: '/customers', color: 'bg-primary/10 text-primary' },
  { icon: Truck, label: 'Shipping', path: '/shipping', color: 'bg-accent text-accent-foreground' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', color: 'bg-success/10 text-success' },
  { icon: UserCog, label: 'Staff', path: '/employees', color: 'bg-muted text-muted-foreground' },
  { icon: Bot, label: 'AI Coach', path: '/ai-coach', color: 'bg-primary/10 text-primary' },
  { icon: TrendingUp, label: 'Growth', path: '/growth', color: 'bg-warning/10 text-warning' },
  { icon: Settings, label: 'Settings', path: '/settings', color: 'bg-muted text-muted-foreground' },
];

const insightCards = [
  { title: 'Sales Overview', desc: 'Revenue trends and performance metrics', icon: TrendingUp, path: '/analytics', accent: 'border-l-primary' },
  { title: 'Order Funnel', desc: 'Conversion & fulfillment rates', icon: ShoppingCart, path: '/analytics', accent: 'border-l-warning' },
  { title: 'Inventory Health', desc: 'Stock levels & reorder alerts', icon: Boxes, path: '/inventory', accent: 'border-l-success' },
  { title: 'Customer Insights', desc: 'Repeat buyers & segment analysis', icon: Users, path: '/customers', accent: 'border-l-info' },
];

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<TodayStats>({ totalSales: 0, totalOrders: 0, liveOrders: 0, avgOrderValue: 0 });
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
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      setStats({ totalSales, totalOrders, liveOrders, avgOrderValue });
      setLoading(false);
    };
    fetchStats();
  }, [currentStore]);

  const statItems = [
    { label: 'Sales', value: `₹${stats.totalSales.toLocaleString('en-IN')}`, icon: IndianRupee, trend: '+12%', color: 'text-primary' },
    { label: 'Orders', value: stats.totalOrders.toString(), icon: ShoppingCart, trend: `${stats.liveOrders} live`, color: 'text-foreground' },
    { label: 'AOV', value: `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`, icon: TrendingUp, trend: null, color: 'text-success' },
    { label: 'Live', value: stats.liveOrders.toString(), icon: CircleDot, trend: null, color: 'text-warning' },
  ];

  return (
    <SellerOSLayout>
      <div className={cn('animate-fade-in', isMobile ? 'space-y-5' : 'space-y-6 grid grid-cols-[1fr_320px] gap-6')}>
        <div className="space-y-5">
          {/* Today Stats */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today so far</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statItems.map((item) => (
                <div key={item.label} className="bg-card rounded-xl border border-border p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <item.icon className={cn('h-4 w-4', item.color)} />
                    {item.trend && (
                      <span className="text-[10px] font-medium text-success flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {item.trend}
                      </span>
                    )}
                  </div>
                  <p className={cn('text-xl font-bold', item.color)}>{loading ? '—' : item.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick links</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {quickLinks.map((link) => (
                <button
                  key={link.path + link.label}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 active:scale-[0.97] transition-all min-h-[76px] justify-center"
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', link.color)}>
                    <link.icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Business Insights — shown inline on mobile, in sidebar col on desktop */}
          {isMobile && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Business insights</h2>
              <div className="space-y-2.5">
                {insightCards.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => navigate(card.path)}
                    className={cn(
                      'flex items-center gap-4 w-full p-4 rounded-xl border border-border border-l-[3px] bg-card hover:bg-muted/30 active:scale-[0.99] transition-all text-left',
                      card.accent
                    )}
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
          )}
        </div>

        {/* Desktop right sidebar */}
        {!isMobile && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Insights</h2>
            {insightCards.map((card) => (
              <button
                key={card.title}
                onClick={() => navigate(card.path)}
                className={cn(
                  'flex items-center gap-3 w-full p-4 rounded-xl border border-border border-l-[3px] bg-card hover:bg-muted/30 transition-colors text-left',
                  card.accent
                )}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </SellerOSLayout>
  );
}
