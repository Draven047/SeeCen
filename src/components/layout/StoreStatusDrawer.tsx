import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useStore } from '@/contexts/StoreContext';
import { StoreSwitcher } from './StoreSwitcher';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Pause, Zap, Clock } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Store Status</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Store selector */}
          <StoreSwitcher collapsed={false} />

          {/* Online/Offline */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-success" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isOnline ? 'Store is Online' : 'Store is Offline'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Accepting new orders' : 'Not accepting orders'}
                </p>
              </div>
            </div>
            <Switch checked={isOnline} onCheckedChange={onToggleOnline} className="scale-125" />
          </div>

          {/* Pause Orders */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Pause className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pause Orders</p>
                <p className="text-xs text-muted-foreground">Temporarily stop receiving</p>
              </div>
            </div>
            <Switch checked={isPaused} onCheckedChange={setIsPaused} />
          </div>

          {/* Rush Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Rush Mode</p>
                <p className="text-xs text-muted-foreground">Priority fulfillment active</p>
              </div>
            </div>
            <Switch checked={isRushMode} onCheckedChange={setIsRushMode} />
          </div>

          {/* Operating Hours */}
          <div className="p-4 rounded-xl border border-border">
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
