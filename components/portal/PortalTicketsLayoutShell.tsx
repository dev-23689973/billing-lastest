import type { ReactNode } from "react";

/** Fills AppMain height so ticket tables can pin pagination to the bottom. */
export function PortalTicketsLayoutShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
