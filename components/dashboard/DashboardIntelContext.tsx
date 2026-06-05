"use client";

import { createContext, useContext } from "react";

import {
  getDashboardIntelTips,
  type DashboardIntelScope,
  type DashboardIntelTips,
} from "@/lib/dashboard/intelGuideTipsScope";
import { INTEL_TIPS } from "@/components/dashboard/intelGuideTips";

type DashboardIntelContextValue = {
  scope: DashboardIntelScope;
  tips: DashboardIntelTips;
  devicesOnlineCount: number | null;
  scopeSubtitle: string;
};

const DashboardIntelContext = createContext<DashboardIntelContextValue>({
  scope: "admin",
  tips: INTEL_TIPS,
  devicesOnlineCount: null,
  scopeSubtitle: "System-wide",
});

export function DashboardIntelProvider({
  scope,
  devicesOnlineCount = null,
  children,
}: {
  scope: DashboardIntelScope;
  devicesOnlineCount?: number | null;
  children: React.ReactNode;
}) {
  const tips = getDashboardIntelTips(scope);
  const scopeSubtitle =
    scope === "manager" ? "Your network" : scope === "reseller" ? "Your dealers" : "System-wide";
  return (
    <DashboardIntelContext.Provider value={{ scope, tips, devicesOnlineCount, scopeSubtitle }}>
      {children}
    </DashboardIntelContext.Provider>
  );
}

export function useDashboardIntel() {
  return useContext(DashboardIntelContext);
}
