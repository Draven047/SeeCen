import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary";
  index?: number;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = "default",
  index = 0,
  className,
}: StatCardProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-lg border bg-card p-5 transition-colors cursor-default",
        variant === "primary" && "border-primary/20 bg-primary/5",
        className,
      )}
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
    </motion.div>
  );
}
