import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link2 } from 'lucide-react';
import { CHANNEL_CONFIG, type SalesChannel } from '@/lib/channelConnectors';
import { cn } from '@/lib/utils';

const channelList: { key: SalesChannel; description: string }[] = [
  { key: 'in_store', description: 'Point-of-sale orders from your physical stores' },
  { key: 'website', description: 'Orders from your Clozzet web store' },
  { key: 'instagram', description: 'Orders via Instagram DMs and shopping' },
  { key: 'whatsapp', description: 'Orders placed through WhatsApp Business' },
  { key: 'marketplace', description: 'Myntra, Ajio, and other marketplace integrations' },
  { key: 'csv_import', description: 'Bulk order import via CSV files' },
];

export default function Channels() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Channels</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your sales channel integrations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelList.map(ch => {
            const cfg = CHANNEL_CONFIG[ch.key];
            return (
              <div key={ch.key} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium', cfg.color)}>
                    <Link2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{cfg.label}</h3>
                    <p className="text-xs text-muted-foreground">{ch.key === 'in_store' ? 'Active' : 'Not connected'}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{ch.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
