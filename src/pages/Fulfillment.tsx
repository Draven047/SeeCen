import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Truck, Package, Clock } from 'lucide-react';

export default function Fulfillment() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Fulfillment</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pack, label, and fulfill orders across all channels
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">Fulfillment Queue</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            Orders awaiting fulfillment will appear here. Manage packing, labeling, and dispatch from a single view.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
