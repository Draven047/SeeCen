import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Trash2, Package, AlertTriangle, Gift, X, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  user_id: string | null;
}

// Live signal notifications are computed from store data, not stored rows.
// Their read-state lives in localStorage keyed by signal id + current count,
// so a NEW breach resurfaces even after the old one was marked read.
const LIVE_READ_KEY = 'seecen-live-notifs-read';

function getLiveReadSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIVE_READ_KEY) || '[]')); } catch { return new Set(); }
}

function markLiveRead(ids: string[]) {
  try {
    const set = getLiveReadSet();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(LIVE_READ_KEY, JSON.stringify([...set].slice(-100)));
  } catch { /* storage unavailable */ }
}

const LIVE_LINKS: Record<string, string> = {
  sla: '/demo/orders',
  ndr: '/demo/ndr',
  low_stock: '/demo/inventory',
  returns: '/demo/returns',
};

async function buildLiveNotifications(): Promise<Notification[]> {
  const nowIso = new Date().toISOString();
  const [ordersRes, invRes, returnsRes] = await Promise.all([
    supabase.from('orders').select('fulfillment_status, sla_deadline'),
    supabase.from('store_inventory').select('quantity, min_stock_level'),
    supabase.from('return_requests').select('id').eq('status', 'pending'),
  ]);
  const orders = (ordersRes.data || []) as { fulfillment_status: string | null; sla_deadline: string | null }[];
  const preDispatch = ['new', 'unfulfilled', 'pending', 'accepted', 'picking', 'packed', 'ready'];
  const slaBreached = orders.filter(
    (o) => preDispatch.includes(o.fulfillment_status || '') && o.sla_deadline && new Date(o.sla_deadline).getTime() < Date.now()
  ).length;
  const failedDeliveries = orders.filter((o) => o.fulfillment_status === 'failed_delivery').length;
  const lowStock = ((invRes.data || []) as { quantity: number; min_stock_level: number | null }[])
    .filter((r) => Number(r.quantity) <= Number(r.min_stock_level || 0)).length;
  const pendingReturns = (returnsRes.data || []).length;

  const signals: { key: string; count: number; title: string; message: string }[] = [
    { key: 'sla', count: slaBreached, title: 'Orders past SLA', message: `${slaBreached} order${slaBreached === 1 ? ' has' : 's have'} crossed the dispatch SLA.` },
    { key: 'ndr', count: failedDeliveries, title: 'Failed deliveries', message: `${failedDeliveries} parcel${failedDeliveries === 1 ? '' : 's'} bounced — reattempt or confirm with the customer.` },
    { key: 'low_stock', count: lowStock, title: 'Low stock', message: `${lowStock} SKU${lowStock === 1 ? ' is' : 's are'} at or below the minimum level.` },
    { key: 'returns', count: pendingReturns, title: 'Returns to review', message: `${pendingReturns} return request${pendingReturns === 1 ? '' : 's'} awaiting a decision.` },
  ];

  const readSet = getLiveReadSet();
  return signals
    .filter((s) => s.count > 0)
    .map((s) => ({
      id: `live_${s.key}_${s.count}`,
      title: s.title,
      message: s.message,
      type: s.key,
      read: readSet.has(`live_${s.key}_${s.count}`),
      created_at: nowIso,
      user_id: null,
    }));
}

export function NotificationsDropdown() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    const [tableRes, live] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20),
      buildLiveNotifications().catch(() => [] as Notification[]),
    ]);
    const tableRows = ((tableRes.data as Notification[]) || []).map(n => ({
      ...n,
      // older seeds store the flag as is_read
      read: n.read ?? (n as Notification & { is_read?: boolean }).is_read ?? false,
    }));
    setNotifications([...live, ...tableRows]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Show toast for new approval requests (admin only)
          if (newNotif.user_id === user?.id || newNotif.user_id === null) {
            toast(newNotif.title, {
              description: newNotif.message,
              action: newNotif.type === 'info' && newNotif.title?.includes('Signup')
                ? { label: 'View', onClick: () => navigate('/admin/approvals') }
                : undefined,
            });
          }
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    if (id.startsWith('live_')) {
      markLiveRead([id]);
    } else {
      await supabase.from('notifications').update({ read: true, is_read: true }).eq('id', id);
    }
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const liveIds = unread.filter(n => n.id.startsWith('live_')).map(n => n.id);
    const tableIds = unread.filter(n => !n.id.startsWith('live_')).map(n => n.id);
    if (liveIds.length > 0) markLiveRead(liveIds);
    if (tableIds.length > 0) {
      await supabase.from('notifications').update({ read: true, is_read: true }).in('id', tableIds);
    }
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getIcon = (type: string, title?: string) => {
    if (title?.includes('Signup') || title?.includes('Approval')) {
      return <UserCheck className="w-4 h-4 text-warning" />;
    }
    switch (type) {
      case 'stock_request':
        return <Package className="w-4 h-4 text-primary" />;
      case 'sla':
      case 'ndr':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'returns':
        return <Package className="w-4 h-4 text-primary" />;
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'milestone':
        return <Gift className="w-4 h-4 text-success" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    // Live signals deep-link to the screen where the work is
    if (LIVE_LINKS[notification.type]) {
      setOpen(false);
      navigate(LIVE_LINKS[notification.type]);
      return;
    }
    // Deep link: approval-related notifications navigate to approvals page
    if (notification.title?.includes('Signup') || notification.title?.includes('Approval')) {
      setOpen(false);
      navigate('/admin/approvals');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17191c] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)] transition-transform hover:scale-[1.03]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#563ed5] px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 overflow-hidden rounded-[28px] border-black/[0.06] bg-white p-0 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]" align="end">
        <div className="flex items-center justify-between border-b border-black/[0.06] p-4">
          <h3 className="font-bold text-[#17191c]">{t('Notifications')}</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              <Check className="w-3 h-3 mr-1" />
              {t('Mark all read')}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 transition-colors cursor-pointer hover:bg-[#f4f5f2]",
                    !notification.read && "bg-[#563ed5]/10"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type, notification.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "text-foreground",
                          notification.read && "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t border-black/[0.06] p-2">
            <Button 
              variant="ghost" 
              className="w-full text-sm h-8 text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
