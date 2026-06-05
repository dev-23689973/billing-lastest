"use client";

import { createContext, useContext } from "react";

type Ctx = {
  rowIndex: number;
  notifyExpanded: (open: boolean) => void;
} | null;

const SubscribersPageVirtualRowExpandContext = createContext<Ctx>(null);

export function SubscribersPageVirtualRowExpandProvider({
  rowIndex,
  notifyExpanded,
  children,
}: {
  rowIndex: number;
  notifyExpanded: (index: number, open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SubscribersPageVirtualRowExpandContext.Provider
      value={{
        rowIndex,
        notifyExpanded: (open) => notifyExpanded(rowIndex, open),
      }}
    >
      {children}
    </SubscribersPageVirtualRowExpandContext.Provider>
  );
}

export function useSubscribersPageVirtualRowExpand() {
  return useContext(SubscribersPageVirtualRowExpandContext);
}
