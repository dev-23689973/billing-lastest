import { cn } from "@/lib/cn";

export function DashboardShellFeedsFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6 lg:gap-8", className)}
      aria-busy="true"
      aria-label="Loading dashboard feeds"
    >
      <div className="h-48 animate-pulse rounded-2xl bg-muted/20" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted/20" />
      <div className="h-56 animate-pulse rounded-2xl bg-muted/20" />
    </div>
  );
}
