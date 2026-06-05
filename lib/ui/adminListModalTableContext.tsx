"use client";

import { createContext, useContext } from "react";

type AdminListModalTableContextValue = {
  hasHiddenColumns: boolean;
  hiddenColumnIds: readonly string[];
};

const AdminListModalTableContext = createContext<AdminListModalTableContextValue>({
  hasHiddenColumns: false,
  hiddenColumnIds: [],
});

export function useAdminListModalTableContext() {
  return useContext(AdminListModalTableContext);
}

export const AdminListModalTableContextProvider = AdminListModalTableContext.Provider;
