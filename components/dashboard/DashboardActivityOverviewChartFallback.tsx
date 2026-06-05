import { cn } from "@/lib/cn";

export function DashboardActivityOverviewChartFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-[min(22rem,42vh)] min-h-[260px] animate-pulse rounded-2xl bg-muted/20 sm:min-h-[300px]", className)}
      aria-busy="true"
      aria-label="Loading user activity overview chart"
    />
  );
}
