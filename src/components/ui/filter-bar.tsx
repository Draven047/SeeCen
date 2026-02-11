import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  filters: {
    key: string;
    label: string;
    options: FilterOption[];
  }[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll?: () => void;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className,
  ...props
}: FilterBarProps) {
  const hasActive = Object.values(activeFilters).some(Boolean);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-1">
          {filter.options.map((option) => {
            const isActive = activeFilters[filter.key] === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onFilterChange(filter.key, isActive ? "" : option.value)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ))}
      {hasActive && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 gap-1 text-xs text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Clear all
        </Button>
      )}
    </div>
  );
}
