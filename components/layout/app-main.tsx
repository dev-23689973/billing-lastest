import * as React from "react";
import { cn } from "@/lib/cn";

export type AppMainProps = React.ComponentProps<"div"> & {
  /** Tickets dashboard / settings: no max-width cap on main; column fills viewport with internal scroll. */
  edgeToEdge?: boolean;
};

/**
 * Main scroll region under chrome: full width, mobile-first horizontal padding,
 * optional max width so tables/forms do not sprawl on ultra-wide displays.
 */
export function AppMain({ className, edgeToEdge = false, ...props }: AppMainProps) {
  return (
    <div
      className={cn(
        edgeToEdge
          ? "flex min-h-0 min-w-0 max-w-none flex-1 flex-col overflow-hidden"
          : cn(
              "thin-scrollbar mx-auto w-full min-w-0 max-w-[min(100%,1920px)] flex-1 overflow-x-hidden overflow-y-auto",
              "px-3 pt-4 pb-2 sm:px-5 sm:pt-5 sm:pb-2.5 lg:px-8 lg:pt-6 lg:pb-3",
            ),
        className,
      )}
      {...props}
    />
  );
}
