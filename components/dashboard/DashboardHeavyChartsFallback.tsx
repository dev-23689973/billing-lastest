import { cn } from "@/lib/cn";

export function DashboardHeavyChartsFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6 lg:gap-8", className)} aria-busy="true" aria-label="Loading dashboard charts">
      <div className="h-[min(20rem,38vh)] animate-pulse rounded-2xl bg-muted/20" />
      <div className="h-[min(18rem,34vh)] animate-pulse rounded-2xl bg-muted/20" />
    </div>
  );
}
