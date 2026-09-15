import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Settings as SettingsIcon, FlaskConical, Bell, Brain, Building2, CreditCard, Gift, ReceiptText, ShieldCheck, Store, WandSparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';

const MOCK_ORDER_KEY = 'seecen_mock_order_enabled';
const NOTIFICATIONS_KEY = 'seecen_notifications_enabled';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [mockOrderEnabled, setMockOrderEnabled] = useState(() => {
    return localStorage.getItem(MOCK_ORDER_KEY) === 'true';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem(NOTIFICATIONS_KEY) !== 'false';
  });

  useEffect(() => {
    localStorage.setItem(MOCK_ORDER_KEY, String(mockOrderEnabled));
    // Dispatch storage event for other components listening
    window.dispatchEvent(new StorageEvent('storage', { key: MOCK_ORDER_KEY, newValue: String(mockOrderEnabled) }));
  }, [mockOrderEnabled]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, String(notificationsEnabled));
  }, [notificationsEnabled]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Workspace controls</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#17191c]">Settings</h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Configure {currentStore?.name || 'your store'}, finance, notifications, loyalty, and AI readiness.
              </p>
            </div>
            <Button onClick={() => navigate('/demo/admin')} className="min-h-[44px] gap-2">
              <ShieldCheck className="h-4 w-4" /> Admin panel
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Store profile', desc: currentStore?.name || 'Select a store to manage profile data.', icon: Store, action: () => navigate('/demo/admin') },
            { title: 'Tax & invoice', desc: 'GST, invoice series, legal name, and receipt footer controls.', icon: ReceiptText, action: () => navigate('/demo/operations') },
            { title: 'Payout setup', desc: 'Bank details, settlements, COD, and report exports.', icon: CreditCard, action: () => navigate('/demo/finance') },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="rounded-[24px] border border-black/[0.04] bg-white p-5 text-left shadow-[0_18px_45px_-40px_rgba(15,23,42,0.5)] transition-transform hover:scale-[1.01]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-[#17191c]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-semibold text-lg">Operating preferences</h3>
                <p className="text-xs text-muted-foreground">Local app behavior for this browser.</p>
              </div>
            </div>
            <SettingSwitch
              id="notifications-enabled"
              title="Notifications"
              desc="Show in-app alerts for orders, stock, and system updates."
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
            <SettingSwitch
              id="mock-order"
              title="Mock Order Popup"
              desc="Receive a simulated new order popup every 60 seconds for testing."
              checked={mockOrderEnabled}
              onCheckedChange={setMockOrderEnabled}
            />
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Brain className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-semibold text-lg">AI Coach</h3>
                <p className="text-xs text-muted-foreground">Configured by server environment only.</p>
              </div>
            </div>
            <div className="rounded-[22px] border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <WandSparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold">Server key required</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    AI generation uses `AI_PROVIDER_API_KEY` on the Supabase edge function. No API key is stored in this browser.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="mt-4 min-h-[40px]" onClick={() => navigate('/demo/ai-coach')}>
                Open AI Coach
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Loyalty', value: 'Fume points', icon: Gift },
            { label: 'Current store', value: currentStore?.name || 'All stores', icon: Building2 },
            { label: 'Demo tools', value: mockOrderEnabled ? 'Order popup on' : 'Order popup off', icon: FlaskConical },
          ].map((item) => (
            <div key={item.label} className="stat-card">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#17191c]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingSwitch({
  id,
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/[0.04] bg-[#fbfcf8] p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-bold">{title}</Label>
        <p className="text-xs leading-5 text-muted-foreground">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
