import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
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
      </div>
    </DashboardLayout>
  );
}
