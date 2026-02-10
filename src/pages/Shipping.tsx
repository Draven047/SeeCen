import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PackageCheck } from 'lucide-react';

export default function Shipping() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Shipping & Pickups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage shipping labels, courier pickups, and delivery tracking
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <PackageCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">Shipping Dashboard</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            Schedule courier pickups, generate shipping labels, and track deliveries in one place.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
