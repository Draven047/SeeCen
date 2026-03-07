import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useStore } from '@/contexts/StoreContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Pause, Zap, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StoreStatusDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
}

export function StoreStatusDrawer({ open, onOpenChange, isOnline, onToggleOnline }: StoreStatusDrawerProps) {
  const { currentStore } = useStore();
  const [isPaused, setIsPaused] = useState(false);
  const [isRushMode, setIsRushMode] = useState(false);

  const handlePause = (checked: boolean) => {
    setIsPaused(checked);
    toast(checked ? 'Orders paused — new orders will be held' : 'Orders resumed');
  };

  const handleRushMode = (checked: boolean) => {
    setIsRushMode(checked);
    toast(checked ? '⚡ Rush mode ON — priority fulfillment active' : 'Rush mode OFF');
  };

  const handleToggleOnline = () => {
    onToggleOnline();
    toast(isOnline ? 'Store is now offline' : 'Store is now online');
  };

  // Overall status indicator
  const statusLabel = !isOnline ? 'Offline' : isPaused ? 'Paused' : isRushMode ? 'Rush' : 'Online';
  const statusColor = !isOnline ? 'bg-muted text-muted-foreground' : isPaused ? 'bg-warning/10 text-warning' : isRushMode ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">Store Status</SheetTitle>
            <Badge className={cn('text-xs', statusColor)}>{statusLabel}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Store selector */}
          <StoreSwitcher collapsed={false} />

          {/* Online/Offline */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border min-h-[72px]">
            <div className="flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', isOnline ? 'bg-success/10' : 'bg-muted')}>
                {isOnline ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isOnline ? 'Store is Online' : 'Store is Offline'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Accepting new orders' : 'Not accepting orders'}
                </p>
              </div>
            </div>
            <Switch checked={isOnline} onCheckedChange={handleToggleOnline} className="scale-125" />
          </div>

          {/* Pause Orders */}
          <div className={cn(
            'flex items-center justify-between p-4 rounded-xl border border-border min-h-[72px] transition-colors',
            isPaused && 'bg-warning/5 border-warning/30'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', isPaused ? 'bg-warning/10' : 'bg-muted')}>
                <Pause className={cn('h-5 w-5', isPaused ? 'text-warning' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pause Orders</p>
                <p className="text-xs text-muted-foreground">
                  {isPaused ? 'New orders are being held' : 'Temporarily stop receiving'}
                </p>
              </div>
            </div>
            <Switch checked={isPaused} onCheckedChange={handlePause} />
          </div>

          {/* Rush Mode */}
          <div className={cn(
            'flex items-center justify-between p-4 rounded-xl border border-border min-h-[72px] transition-colors',
            isRushMode && 'bg-primary/5 border-primary/30'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', isRushMode ? 'bg-primary/10' : 'bg-muted')}>
                <Zap className={cn('h-5 w-5', isRushMode ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Rush Mode</p>
                <p className="text-xs text-muted-foreground">
                  {isRushMode ? '⚡ Priority fulfillment active' : 'Enable for priority fulfillment'}
                </p>
              </div>
            </div>
            <Switch checked={isRushMode} onCheckedChange={handleRushMode} />
          </div>

          {/* Operating Hours */}
          <div className="p-4 rounded-xl border border-border min-h-[56px]">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Operating Hours</p>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              Mon – Sat: 10:00 AM – 8:00 PM
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
