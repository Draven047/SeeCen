import { cn } from "@/lib/utils";

interface PageLoadingProps {
  label?: string;
  rows?: number;
  className?: string;
}

export function PageLoading({ label = "Loading workspace", rows = 3, className }: PageLoadingProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-4 animate-fade-in", className)}>
      <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 animate-shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-36 rounded-full animate-shimmer" />
            <div className="h-8 w-56 max-w-full rounded-full animate-shimmer" />
          </div>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
            <div className="h-4 w-24 rounded-full animate-shimmer" />
            <div className="mt-5 h-10 w-32 rounded-full animate-shimmer" />
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full rounded-full animate-shimmer" />
              <div className="h-3 w-2/3 rounded-full animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
