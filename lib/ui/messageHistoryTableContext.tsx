"use client";

import { createContext, useContext, type ReactNode } from "react";

export type MessageHistoryTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const MessageHistoryTableContext = createContext<MessageHistoryTableContextValue | null>(null);

export function MessageHistoryTableContextProvider({
  value,
  children,
}: {
  value: MessageHistoryTableContextValue;
  children: ReactNode;
}) {
  return (
    <MessageHistoryTableContext.Provider value={value}>{children}</MessageHistoryTableContext.Provider>
  );
}

export function useMessageHistoryTableContext(): MessageHistoryTableContextValue {
  const ctx = useContext(MessageHistoryTableContext);
  if (!ctx) {
    throw new Error("useMessageHistoryTableContext must be used within MessageHistoryTableScrollShell");
  }
  return ctx;
}
