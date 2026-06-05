"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { DashboardTrendPoint } from "@/lib/dashboard/types";
import type { HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import {
  buildActivityChartPoints,
  growthStatsForPeriod,
} from "@/lib/dashboardPeriodSlice";
import { ADMIN_HUD_PERIOD_EVENT, ADMIN_HUD_PERIOD_KEY } from "@/components/dashboard/hud/adminHudPeriodSync";
import { parseHudPeriodId, type HudPeriodId } from "@/components/dashboard/hud/HudPeriodStrip";

export type DashboardPeriodContextValue = {
  period: HudPeriodId;
  setPeriod: (p: HudPeriodId) => void;
  trendFull: DashboardTrendPoint[];
  dailyPointsFull: HudDualSeriesPoint[];
  hydrateDailyPoints: (points: HudDualSeriesPoint[]) => void;
  activityChartPoints: HudDualSeriesPoint[];
  growthLastNew: number;
  growthMaxNew: number;
};

const DashboardPeriodContext = createContext<DashboardPeriodContextValue | null>(null);

export function DashboardPeriodProvider({
  trendFull,
  dailyPointsFull: initialDailyPoints,
  defaultPeriod = "1y",
  children,
}: {
  trendFull: DashboardTrendPoint[];
  dailyPointsFull: HudDualSeriesPoint[];
  /** Used until sessionStorage hydrates (must match header default). */
  defaultPeriod?: HudPeriodId;
  children: ReactNode;
}) {
  const [period, setPeriodState] = useState<HudPeriodId>(defaultPeriod);
  const [dailyPointsFull, setDailyPointsFull] = useState(initialDailyPoints);
  const [clientHydrated, setClientHydrated] = useState(false);
  const hydratedDailyRef = useRef(false);

  const hydrateDailyPoints = useCallback((points: HudDualSeriesPoint[]) => {
    hydratedDailyRef.current = true;
    setDailyPointsFull(points);
  }, []);

  /** Do not overwrite deferred chart hydration with the shell's empty 366-day placeholder. */
  useEffect(() => {
    if (hydratedDailyRef.current) return;
    const hasActivity = initialDailyPoints.some((p) => p.a > 0 || p.b > 0);
    if (hasActivity) setDailyPointsFull(initialDailyPoints);
  }, [initialDailyPoints]);

  useEffect(() => {
    setClientHydrated(true);
  }, []);

  /** Restore saved period only after hydration so streamed Suspense charts match server HTML. */
  useEffect(() => {
    if (!clientHydrated) return;
    const stored = parseHudPeriodId(sessionStorage.getItem(ADMIN_HUD_PERIOD_KEY));
    if (stored) setPeriodState(stored);
  }, [clientHydrated]);

  useEffect(() => {
    const handler = (e: Event) => {
      const raw = (e as CustomEvent<string>).detail;
      const parsed = parseHudPeriodId(raw);
      if (parsed) setPeriodState(parsed);
    };
    window.addEventListener(ADMIN_HUD_PERIOD_EVENT, handler as EventListener);
    return () => window.removeEventListener(ADMIN_HUD_PERIOD_EVENT, handler as EventListener);
  }, []);

  const setPeriod = useCallback((next: HudPeriodId) => {
    setPeriodState(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_HUD_PERIOD_KEY, next);
      window.dispatchEvent(new CustomEvent(ADMIN_HUD_PERIOD_EVENT, { detail: next }));
    }
  }, []);

  const value = useMemo(() => {
    const activityChartPoints = buildActivityChartPoints(trendFull, dailyPointsFull, period);
    const { lastNew, maxNew } = growthStatsForPeriod(trendFull, dailyPointsFull, period);
    return {
      period,
      setPeriod,
      trendFull,
      dailyPointsFull,
      hydrateDailyPoints,
      activityChartPoints,
      growthLastNew: lastNew,
      growthMaxNew: maxNew,
    };
  }, [period, setPeriod, trendFull, dailyPointsFull, hydrateDailyPoints]);

  return <DashboardPeriodContext.Provider value={value}>{children}</DashboardPeriodContext.Provider>;
}

export function useDashboardPeriod(): DashboardPeriodContextValue {
  const ctx = useContext(DashboardPeriodContext);
  if (!ctx) {
    throw new Error("useDashboardPeriod must be used within DashboardPeriodProvider");
  }
  return ctx;
}

export function useOptionalDashboardPeriod(): DashboardPeriodContextValue | null {
  return useContext(DashboardPeriodContext);
}
