import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Settings as SettingsIcon, FlaskConical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MOCK_ORDER_KEY = 'clozzet_mock_order_enabled';

export default function SettingsPage() {
  const [mockOrderEnabled, setMockOrderEnabled] = useState(() => {
    return localStorage.getItem(MOCK_ORDER_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(MOCK_ORDER_KEY, String(mockOrderEnabled));
    // Dispatch storage event for other components listening
    window.dispatchEvent(new StorageEvent('storage', { key: MOCK_ORDER_KEY, newValue: String(mockOrderEnabled) }));
  }, [mockOrderEnabled]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-display">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure your store, tax, and app preferences</p>
        </div>

        <div className="glass-card p-12 text-center">
          <SettingsIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">App Settings</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            Tax configuration, invoice series, fume points, and notification preferences.
          </p>
        </div>

        {/* Testing & Development */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Testing & Development</h3>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="mock-order" className="text-sm font-medium">Mock Order Popup</Label>
              <p className="text-xs text-muted-foreground">
                Receive a simulated new order popup every 60 seconds for testing
              </p>
            </div>
            <Switch
              id="mock-order"
              checked={mockOrderEnabled}
              onCheckedChange={setMockOrderEnabled}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
