import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DollarSign } from 'lucide-react';

export default function Finance() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revenue reports, tax summaries, and audit logs
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">Finance Dashboard</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            View revenue summaries, GST reports, credit notes, and finance audit trail.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
