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
  ChevronRight, Boxes, CircleDot, ArrowUpRight, Zap, Clock,
  AlertTriangle, CheckCircle2,
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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentStore) { setLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];

      const [ordersRes, recentRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total, fulfillment_status, status')
          .eq('store_id', currentStore.id)
          .gte('created_at', today),
        supabase
          .from('orders')
          .select('id, order_number, total, status, fulfillment_status, created_at, customer:customers(name)')
          .eq('store_id', currentStore.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const orders = ordersRes.data || [];
      const totalOrders = orders.length;
      const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
      const liveOrders = orders.filter(o =>
        !['delivered', 'fulfilled', 'cancelled', 'declined'].includes(o.fulfillment_status)
      ).length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      setStats({ totalSales, totalOrders, liveOrders, avgOrderValue });
      setRecentOrders(recentRes.data || []);
      setLoading(false);
    };
    fetchStats();
  }, [currentStore]);

  const statItems = [
    { label: 'Sales', value: `₹${stats.totalSales.toLocaleString('en-IN')}`, icon: IndianRupee, trend: '+12%', color: 'text-primary', bgColor: 'bg-primary/8' },
    { label: 'Orders', value: stats.totalOrders.toString(), icon: ShoppingCart, trend: `${stats.liveOrders} live`, color: 'text-foreground', bgColor: 'bg-muted' },
    { label: 'AOV', value: `₹${Math.round(stats.avgOrderValue).toLocaleString('en-IN')}`, icon: TrendingUp, trend: null, color: 'text-success', bgColor: 'bg-success/8' },
    { label: 'Live', value: stats.liveOrders.toString(), icon: CircleDot, trend: null, color: 'text-warning', bgColor: 'bg-warning/8' },
  ];

  // Mobile layout
  if (isMobile) {
    return (
      <SellerOSLayout>
        <div className="space-y-5 animate-fade-in">
          {/* Today Stats */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today so far</h2>
            <div className="grid grid-cols-2 gap-3">
              {statItems.map((item) => (
                <div key={item.label} className="bg-card rounded-xl border border-border p-4">
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
            <div className="grid grid-cols-4 gap-2.5">
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

          {/* Business Insights */}
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
        </div>
      </SellerOSLayout>
    );
  }

  // Desktop layout — completely redesigned
  return (
    <SellerOSLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentStore?.name || 'All stores'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4">
          {statItems.map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bgColor)}>
                  <item.icon className={cn('h-5 w-5', item.color)} />
                </div>
                {item.trend && (
                  <span className="text-xs font-medium text-success flex items-center gap-0.5 ml-auto">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {item.trend}
                  </span>
                )}
              </div>
              <p className={cn('text-2xl font-bold tracking-tight', item.color)}>{loading ? '—' : item.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Main content area — 3-column */}
        <div className="grid grid-cols-12 gap-5">
          {/* Left: Quick links */}
          <div className="col-span-3 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick links</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.path + link.label}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all min-h-[80px] justify-center group"
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110', link.color)}>
                    <link.icon className="h-[17px] w-[17px]" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Recent orders */}
          <div className="col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent orders</h2>
              <button onClick={() => navigate('/orders')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No orders today</p>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const customerName = (order.customer as any)?.name || 'Walk-in';
                  const statusColor = order.fulfillment_status === 'delivered' ? 'text-success' :
                    order.fulfillment_status === 'unfulfilled' ? 'text-warning' : 'text-info';
                  const StatusIcon = order.fulfillment_status === 'delivered' ? CheckCircle2 :
                    order.fulfillment_status === 'unfulfilled' ? Clock : Package;

                  return (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className={cn('w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0')}>
                        <StatusIcon className={cn('h-4 w-4', statusColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{order.order_number}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
                            {order.fulfillment_status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{customerName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">₹{Number(order.total).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Insights */}
          <div className="col-span-4 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Insights</h2>
            <div className="space-y-3">
              {insightCards.map((card) => (
                <button
                  key={card.title}
                  onClick={() => navigate(card.path)}
                  className={cn(
                    'flex items-center gap-3 w-full p-4 rounded-xl border border-border border-l-[3px] bg-card hover:bg-muted/30 hover:shadow-sm transition-all text-left group',
                    card.accent
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>

            {/* Store health */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Store health</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Fulfilment rate', value: '96%', good: true },
                  { label: 'Avg pack time', value: '12 min', good: true },
                  { label: 'Return rate', value: '3.2%', good: true },
                  { label: 'Rejection rate', value: '1.8%', good: true },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{m.value}</span>
                      {m.good ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerOSLayout>
  );
}
