"use client";

import { createContext, useContext } from "react";

type PortalInboxTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const PortalInboxTableContext = createContext<PortalInboxTableContextValue>({
  hasHiddenColumns: false,
  hiddenColumnIds: [],
});

export function usePortalInboxTableContext() {
  return useContext(PortalInboxTableContext);
}

export const PortalInboxTableContextProvider = PortalInboxTableContext.Provider;
