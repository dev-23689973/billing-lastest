import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Pagination only below `lg` (matches mobile bottom nav). Tip + row count on wide desktop. */
export function StaffListTableFooterBar({
  pagination,
  summary,
  tip = "Tip: double-click Name to edit; click the Status switch to activate or suspend.",
  className,
}: {
  pagination: ReactNode;
  summary: ReactNode;
  tip?: ReactNode | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full shrink-0 flex-col items-stretch gap-1 border-t border-border/50 bg-card/95 px-2 py-1.5 text-[11px] leading-snug backdrop-blur-sm",
        "lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-2 lg:px-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-center overflow-x-auto lg:shrink-0">{pagination}</div>
      {tip != null ? (
        <p className="max-lg:hidden min-w-0 flex-1 truncate px-0.5 text-center text-muted-foreground/80 lg:block">
          {tip}
        </p>
      ) : (
        <span className="max-lg:hidden min-w-0 flex-1 lg:block" aria-hidden />
      )}
      <div className="max-lg:hidden shrink-0 whitespace-nowrap text-muted-foreground lg:block lg:text-right">
        {summary}
      </div>
    </div>
  );
}
