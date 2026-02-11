import * as React from "react";
import { cn } from "@/lib/utils";

type StatusType = "new" | "processing" | "shipped" | "delivered" | "cancelled" | "rto" | "created" | "paid" | "pending" | "approved" | "rejected" | "fulfilled";

const statusConfig: Record<StatusType, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  new:        { label: "New",        dotClass: "bg-info",        bgClass: "bg-info/10",        textClass: "text-info" },
  created:    { label: "Created",    dotClass: "bg-info",        bgClass: "bg-info/10",        textClass: "text-info" },
  pending:    { label: "Pending",    dotClass: "bg-warning",     bgClass: "bg-warning/10",     textClass: "text-warning" },
  processing: { label: "Processing", dotClass: "bg-warning",     bgClass: "bg-warning/10",     textClass: "text-warning" },
  paid:       { label: "Paid",       dotClass: "bg-primary",     bgClass: "bg-primary/10",     textClass: "text-primary" },
  approved:   { label: "Approved",   dotClass: "bg-success",     bgClass: "bg-success/10",     textClass: "text-success" },
  shipped:    { label: "Shipped",    dotClass: "bg-primary",     bgClass: "bg-primary/10",     textClass: "text-primary" },
  delivered:  { label: "Delivered",  dotClass: "bg-success",     bgClass: "bg-success/10",     textClass: "text-success" },
  fulfilled:  { label: "Fulfilled",  dotClass: "bg-success",     bgClass: "bg-success/10",     textClass: "text-success" },
  cancelled:  { label: "Cancelled",  dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive" },
  rejected:   { label: "Rejected",   dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive" },
  rto:        { label: "RTO",        dotClass: "bg-warning",     bgClass: "bg-warning/10",     textClass: "text-warning" },
};

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
}

export function StatusChip({ status, label, className, ...props }: StatusChipProps) {
  const config = statusConfig[status] ?? statusConfig.new;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgClass,
        config.textClass,
        className,
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {label ?? config.label}
    </span>
  );
}
