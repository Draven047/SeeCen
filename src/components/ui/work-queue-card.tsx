import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, User, Package } from "lucide-react";
import { StatusChip } from "./status-chip";

type SlaUrgency = "safe" | "warning" | "critical" | "breached";

function getSlaUrgency(deadlineMs: number): SlaUrgency {
  const hoursLeft = deadlineMs / (1000 * 60 * 60);
  if (hoursLeft <= 0) return "breached";
  if (hoursLeft < 1) return "critical";
  if (hoursLeft < 4) return "warning";
  return "safe";
}

function formatTimeLeft(deadlineMs: number): string {
  if (deadlineMs <= 0) return "Breached";
  const totalMin = Math.floor(deadlineMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

const urgencyStyles: Record<SlaUrgency, string> = {
  safe: "border-l-success text-success",
  warning: "border-l-warning text-warning",
  critical: "border-l-destructive text-destructive",
  breached: "border-l-destructive text-destructive animate-sla-pulse",
};

interface WorkQueueCardProps extends React.HTMLAttributes<HTMLDivElement> {
  orderNumber: string;
  customerName: string;
  itemCount: number;
  status: "created" | "paid" | "shipped" | "delivered" | "processing" | "new";
  slaDeadline?: string | null;
  channel?: string;
  actions?: React.ReactNode;
}

export function WorkQueueCard({
  orderNumber,
  customerName,
  itemCount,
  status,
  slaDeadline,
  channel,
  actions,
  className,
  ...props
}: WorkQueueCardProps) {
  const now = Date.now();
  const deadlineMs = slaDeadline ? new Date(slaDeadline).getTime() - now : Infinity;
  const urgency = slaDeadline ? getSlaUrgency(deadlineMs) : "safe";

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card p-4 transition-shadow hover:shadow-md",
        slaDeadline && urgencyStyles[urgency],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-body-medium font-semibold text-foreground">{orderNumber}</span>
            <StatusChip status={status} />
            {channel && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {channel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {customerName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" />
              {itemCount} item{itemCount !== 1 && "s"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {slaDeadline && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", urgencyStyles[urgency])}>
              <Clock className="h-3.5 w-3.5" />
              {formatTimeLeft(deadlineMs)}
            </span>
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
