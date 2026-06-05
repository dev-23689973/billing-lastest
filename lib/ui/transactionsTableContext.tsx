"use client";

import { createContext, useContext } from "react";

type TransactionsTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const TransactionsTableContext = createContext<TransactionsTableContextValue>({
  hasHiddenColumns: false,
  hiddenColumnIds: [],
});

export function useTransactionsTableContext() {
  return useContext(TransactionsTableContext);
}

export const TransactionsTableContextProvider = TransactionsTableContext.Provider;
