import { useState } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Warning {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  cta?: string;
  onAction?: () => void;
}

// This component will eventually consume real data from store health checks
export function WarningBannerSystem() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Placeholder — in production these come from store health queries
  const warnings: Warning[] = [];

  const visible = warnings.filter(w => !dismissed.includes(w.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.map((warning) => (
        <div
          key={warning.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm',
            warning.type === 'critical' && 'bg-destructive/10 text-destructive border-b border-destructive/20',
            warning.type === 'warning' && 'bg-warning/10 text-warning-foreground border-b border-warning/20',
            warning.type === 'info' && 'bg-info/10 text-info border-b border-info/20',
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1 font-medium">{warning.message}</span>
          {warning.cta && (
            <button
              onClick={warning.onAction}
              className="flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              {warning.cta}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setDismissed(prev => [...prev, warning.id])}
            className="p-1 rounded hover:bg-foreground/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
