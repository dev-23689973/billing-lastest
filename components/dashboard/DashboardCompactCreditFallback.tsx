export function DashboardCompactCreditSummaryFallback() {
  return (
    <div
      className="h-full min-h-[16rem] animate-pulse rounded-2xl bg-muted/20 sm:min-h-[18rem]"
      aria-busy="true"
      aria-label="Loading transactions summary"
    />
  );
}

export function DashboardCompactCreditChartFallback() {
  return (
    <div
      className="h-full min-h-[16rem] animate-pulse rounded-2xl bg-muted/20 sm:min-h-[18rem]"
      aria-busy="true"
      aria-label="Loading credit flow chart"
    />
  );
}
