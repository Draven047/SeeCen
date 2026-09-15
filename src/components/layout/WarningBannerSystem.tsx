import { useState, useEffect, useCallback, useRef } from 'react';
import i18n from '@/i18n';
import { AlertTriangle, X, ChevronRight, RefreshCw, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

interface Warning {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  icon?: any;
  cta?: string;
  ctaPath?: string;
}

export function WarningBannerSystem() {
  const { currentStore } = useStore();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [swipeState, setSwipeState] = useState<Record<string, { startX: number; currentX: number }>>({});

  const checkHealth = useCallback(async () => {
    if (!currentStore) return;
    const newWarnings: Warning[] = [];

    const { data: syncErrors } = await supabase
      .from('channel_sync_logs')
      .select('id, error_message')
      .eq('status', 'failed')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (syncErrors && syncErrors.length > 0) {
      newWarnings.push({
        id: 'sync-error',
        type: 'critical',
        message: 'Channel sync failed in the last 24 hours',
        icon: RefreshCw,
        cta: 'View Channels',
        ctaPath: '/demo/channels',
      });
    }

    const { data: codPending } = await supabase
      .from('cod_reconciliation')
      .select('expected_amount, collected_amount')
      .eq('store_id', currentStore.id)
      .eq('status', 'pending');

    const totalCodGap = (codPending || []).reduce(
      (s, c) => s + (Number(c.expected_amount) - Number(c.collected_amount)), 0
    );

    if (totalCodGap > 5000) {
      newWarnings.push({
        id: 'cod-gap',
        type: 'warning',
        message: `₹${totalCodGap.toLocaleString('en-IN')} ${i18n.t('COD pending reconciliation')}`,
        icon: IndianRupee,
        cta: i18n.t('Review'),
        ctaPath: '/demo/finance',
      });
    }

    const { data: lowStock } = await supabase
      .from('store_inventory')
      .select('id')
      .eq('store_id', currentStore.id)
      .lt('quantity', 5)
      .limit(1);

    if (lowStock && lowStock.length > 0) {
      newWarnings.push({
        id: 'low-stock',
        type: 'info',
        message: i18n.t('Some items are running low on stock'),
        icon: AlertTriangle,
        cta: i18n.t('View Inventory'),
        ctaPath: '/demo/inventory',
      });
    }

    setWarnings(newWarnings);
  }, [currentStore]);

  // Initial check + 60s auto-refresh
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Swipe handlers
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    setSwipeState(prev => ({ ...prev, [id]: { startX: e.touches[0].clientX, currentX: 0 } }));
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    setSwipeState(prev => {
      const s = prev[id];
      if (!s) return prev;
      const dx = e.touches[0].clientX - s.startX;
      return { ...prev, [id]: { ...s, currentX: dx } };
    });
  };

  const handleTouchEnd = (id: string) => {
    const s = swipeState[id];
    if (s && Math.abs(s.currentX) > 100) {
      // Animate out then dismiss
      setSwipeState(prev => ({
        ...prev,
        [id]: { ...prev[id], currentX: s.currentX > 0 ? 500 : -500 },
      }));
      setTimeout(() => {
        setDismissed(prev => [...prev, id]);
        setSwipeState(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 200);
    } else {
      // Snap back
      setSwipeState(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const visible = warnings.filter(w => !dismissed.includes(w.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.map((warning) => {
        const Icon = warning.icon || AlertTriangle;
        const sw = swipeState[warning.id];
        const translateX = sw?.currentX || 0;
        const isAnimatingOut = Math.abs(translateX) > 200;

        return (
          <div
            key={warning.id}
            onTouchStart={(e) => handleTouchStart(warning.id, e)}
            onTouchMove={(e) => handleTouchMove(warning.id, e)}
            onTouchEnd={() => handleTouchEnd(warning.id)}
            style={{
              transform: `translateX(${translateX}px)`,
              opacity: Math.max(0, 1 - Math.abs(translateX) / 300),
              transition: sw && !isAnimatingOut ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
            }}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm min-h-[44px]',
              warning.type === 'critical' && 'bg-destructive/10 text-destructive border-b border-destructive/20',
              warning.type === 'warning' && 'bg-warning/10 text-warning-foreground border-b border-warning/20',
              warning.type === 'info' && 'bg-info/10 text-info border-b border-info/20',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 font-medium text-xs sm:text-sm">{warning.message}</span>
            {warning.cta && (
              <a
                href={warning.ctaPath || '#'}
                className="flex items-center gap-1 text-xs font-semibold hover:underline whitespace-nowrap min-h-[44px] px-2"
              >
                {warning.cta}
                <ChevronRight className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={() => setDismissed(prev => [...prev, warning.id])}
              className="p-2 rounded hover:bg-foreground/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
