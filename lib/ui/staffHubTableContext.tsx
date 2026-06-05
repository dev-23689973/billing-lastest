"use client";

import { createContext, useContext } from "react";

type StaffHubTableContextValue = {
  /** True when overflow hiding moved at least one column into the expand panel. */
  hasHiddenColumns: boolean;
  /** Column ids currently hidden from the table (shown in expand panel). */
  hiddenColumnIds: readonly string[];
};

const StaffHubTableContext = createContext<StaffHubTableContextValue>({
  hasHiddenColumns: false,
  hiddenColumnIds: [],
});

export function useStaffHubTableContext() {
  return useContext(StaffHubTableContext);
}

export const StaffHubTableContextProvider = StaffHubTableContext.Provider;
