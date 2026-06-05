import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({
  title,
  className,
  subtleHeader,
  headerRight,
  children,
}: {
  title?: string;
  className?: string;
  /** Sidebar-style card: compact uppercase title. */
  subtleHeader?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/90 bg-card text-card-foreground shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.02] transition-shadow duration-300 dark:ring-white/[0.04]",
        className,
      )}
    >
      {title ? (
        <header
          className={cn(
            "border-b border-border/80 px-4 py-3 sm:px-5",
            subtleHeader ? "bg-muted/10" : "bg-muted/20",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              className={cn(
                subtleHeader
                  ? "text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                  : "text-base font-semibold tracking-tight text-foreground",
              )}
            >
              {title}
            </h2>
            {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
          </div>
        </header>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
