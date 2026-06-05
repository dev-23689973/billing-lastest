"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TicketsQueueTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const TicketsQueueTableContext = createContext<TicketsQueueTableContextValue | null>(null);

export function TicketsQueueTableContextProvider({
  value,
  children,
}: {
  value: TicketsQueueTableContextValue;
  children: ReactNode;
}) {
  return <TicketsQueueTableContext.Provider value={value}>{children}</TicketsQueueTableContext.Provider>;
}

export function useTicketsQueueTableContext(): TicketsQueueTableContextValue {
  const ctx = useContext(TicketsQueueTableContext);
  if (!ctx) {
    throw new Error("useTicketsQueueTableContext must be used within TicketsQueueTableScrollShell");
  }
  return ctx;
}
