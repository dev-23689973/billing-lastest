"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SubscribersPageTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const SubscribersPageTableContext = createContext<SubscribersPageTableContextValue | null>(null);

export function SubscribersPageTableContextProvider({
  value,
  children,
}: {
  value: SubscribersPageTableContextValue;
  children: ReactNode;
}) {
  return (
    <SubscribersPageTableContext.Provider value={value}>{children}</SubscribersPageTableContext.Provider>
  );
}

export function useSubscribersPageTableContext(): SubscribersPageTableContextValue {
  const ctx = useContext(SubscribersPageTableContext);
  if (!ctx) {
    throw new Error("useSubscribersPageTableContext must be used within SubscribersPageTableScrollShell");
  }
  return ctx;
}
