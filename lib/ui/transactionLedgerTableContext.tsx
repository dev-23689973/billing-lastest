"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TransactionLedgerTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const TransactionLedgerTableContext = createContext<TransactionLedgerTableContextValue | null>(null);

export function TransactionLedgerTableContextProvider({
  value,
  children,
}: {
  value: TransactionLedgerTableContextValue;
  children: ReactNode;
}) {
  return (
    <TransactionLedgerTableContext.Provider value={value}>{children}</TransactionLedgerTableContext.Provider>
  );
}

export function useTransactionLedgerTableContext(): TransactionLedgerTableContextValue {
  const ctx = useContext(TransactionLedgerTableContext);
  if (!ctx) {
    throw new Error("useTransactionLedgerTableContext must be used within TransactionLedgerTableScrollShell");
  }
  return ctx;
}
