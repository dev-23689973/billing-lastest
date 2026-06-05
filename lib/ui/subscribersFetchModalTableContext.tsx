"use client";

import { createContext, useContext } from "react";

type SubscribersFetchModalTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const SubscribersFetchModalTableContext = createContext<SubscribersFetchModalTableContextValue>({
  hasHiddenColumns: false,
  hiddenColumnIds: [],
});

export function useSubscribersFetchModalTableContext() {
  return useContext(SubscribersFetchModalTableContext);
}

export const SubscribersFetchModalTableContextProvider = SubscribersFetchModalTableContext.Provider;
