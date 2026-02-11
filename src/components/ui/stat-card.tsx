import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary";
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = "default",
  className,
  ...props
}: StatCardProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 transition-shadow hover:shadow-md",
        variant === "primary" && "border-primary/20 bg-primary/5",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <p className="text-caption text-muted-foreground">{title}</p>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {change != null && (
        <div className="mt-1.5 flex items-center gap-1 text-xs">
          {isPositive && <TrendingUp className="h-3.5 w-3.5 text-success" />}
          {isNegative && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          {!isPositive && !isNegative && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className={cn(
            "font-medium",
            isPositive && "text-success",
            isNegative && "text-destructive",
            !isPositive && !isNegative && "text-muted-foreground",
          )}>
            {isPositive && "+"}
            {change}%
          </span>
          {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
