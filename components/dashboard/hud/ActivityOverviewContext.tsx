"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AdminDayActivityAccountRow, AdminDayActivityCounts } from "@/lib/dashboard/types";
import { HudCalendarMonthGrid } from "@/components/dashboard/hud/HudCalendarMonthGrid";
import { HudDailyActivityDetail } from "@/components/dashboard/hud/HudDailyActivityDetail";
import { HudMonthNavigator } from "@/components/dashboard/hud/HudMonthNavigator";
import {
  hudCalendarGridRange,
  hudIsFutureLocalDay,
  hudLocalDateKey,
} from "@/components/dashboard/hud/hudMonthKey";
import { hudDashShell } from "@/components/dashboard/hud/hudDashboardLayout";
import { loadActivityCalendarAction, loadActivityDayDetailAction } from "@/actions/activityCalendar";
import { apiBaseToModalScope } from "@/lib/modalScope";
import { cn } from "@/lib/cn";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

type DayDetailPayload = {
  newCount: number;
  expiredCount: number;
  newUsers: AdminDayActivityAccountRow[];
  expiredUsers: AdminDayActivityAccountRow[];
};

type ActivityOverviewContextValue = {
  activityApiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  viewMonth: Date;
  selected: Date;
  showDailyDetail: boolean;
  activeDetailDate: Date;
  activityByDay: Record<string, AdminDayActivityCounts>;
  detailPayload: DayDetailPayload | null;
  detailLoading: boolean;
  monthNavigatorTitleDate: Date;
  activeDayKey: string;
  summaryForActiveDay: AdminDayActivityCounts | undefined;
  setViewMonth: React.Dispatch<React.SetStateAction<Date>>;
  goToToday: () => void;
  selectDay: (d: Date) => void;
  closeDailyDetail: () => void;
  getDayMarkers: (date: Date) => { newUsers: boolean; expiredUsers: boolean } | undefined;
};

const ActivityOverviewContext = createContext<ActivityOverviewContextValue | null>(null);

function useActivityOverviewContext() {
  const ctx = useContext(ActivityOverviewContext);
  if (!ctx) {
    throw new Error("Activity overview components must be used within ActivityOverviewProvider");
  }
  return ctx;
}

export function ActivityOverviewProvider({
  activityApiBase,
  children,
}: {
  activityApiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  children: ReactNode;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [showDailyDetail, setShowDailyDetail] = useState(false);
  const [activeDetailDate, setActiveDetailDate] = useState(() => new Date());
  const [activityByDay, setActivityByDay] = useState<Record<string, AdminDayActivityCounts>>({});
  const [detailPayload, setDetailPayload] = useState<DayDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const y = viewMonth.getFullYear();
  const mo = viewMonth.getMonth();
  const monthNavigatorTitleDate =
    selected.getFullYear() === y && selected.getMonth() === mo ? selected : startOfMonth(viewMonth);
  const activeDayKey = useMemo(() => hudLocalDateKey(activeDetailDate), [activeDetailDate]);
  const summaryForActiveDay = activityByDay[activeDayKey];

  /** One fetch for the whole dashboard — multiple calendar panels share this state. */
  useEffect(() => {
    const { start, end } = hudCalendarGridRange(viewMonth);
    const from = hudLocalDateKey(start);
    const to = hudLocalDateKey(end);
    let cancelled = false;
    void loadActivityCalendarAction({ scope: apiBaseToModalScope(activityApiBase), from, to })
      .then((data) => {
        if (cancelled || !data.ok || !data.days || typeof data.days !== "object") return;
        setActivityByDay(data.days);
      })
      .catch(() => {
        if (!cancelled) setActivityByDay({});
      });
    return () => {
      cancelled = true;
    };
  }, [viewMonth, activityApiBase]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setSelected(t);
    setViewMonth(startOfMonth(t));
    setShowDailyDetail(false);
  }, []);

  const loadDayDetail = useCallback(
    (d: Date, signal: AbortSignal) => {
      const key = hudLocalDateKey(d);
      setDetailLoading(true);
      setDetailPayload(null);
      void loadActivityDayDetailAction({ scope: apiBaseToModalScope(activityApiBase), date: key })
        .then((result) => {
          if (signal.aborted) return;
          if (!result.ok) {
            setDetailPayload({ newCount: 0, expiredCount: 0, newUsers: [], expiredUsers: [] });
            return;
          }
          const data = result.data;
          setDetailPayload({
            newCount: Math.max(0, Math.floor(Number(data.newCount ?? 0))),
            expiredCount: Math.max(0, Math.floor(Number(data.expiredCount ?? 0))),
            newUsers: Array.isArray(data.newUsers) ? data.newUsers : [],
            expiredUsers: Array.isArray(data.expiredUsers) ? data.expiredUsers : [],
          });
        })
        .catch(() => {
          if (signal.aborted) return;
          setDetailPayload({ newCount: 0, expiredCount: 0, newUsers: [], expiredUsers: [] });
        })
        .finally(() => {
          if (!signal.aborted) setDetailLoading(false);
        });
    },
    [activityApiBase],
  );

  useEffect(() => {
    if (!showDailyDetail) {
      setDetailPayload(null);
      setDetailLoading(false);
      return;
    }
    const ac = new AbortController();
    loadDayDetail(activeDetailDate, ac.signal);
    return () => ac.abort();
  }, [showDailyDetail, activeDetailDate, loadDayDetail]);

  useEffect(() => {
    if (!showDailyDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDailyDetail(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDailyDetail]);

  const selectDay = useCallback((d: Date) => {
    if (hudIsFutureLocalDay(d)) return;
    setSelected(d);
    setViewMonth(startOfMonth(d));
    setActiveDetailDate(d);
    setShowDailyDetail(true);
  }, []);

  const closeDailyDetail = useCallback(() => {
    setShowDailyDetail(false);
  }, []);

  const getDayMarkers = useCallback(
    (date: Date) => {
      if (hudIsFutureLocalDay(date)) return undefined;
      const key = hudLocalDateKey(date);
      const row = activityByDay[key];
      if (!row) return undefined;
      if (row.newCount <= 0 && row.expiredCount <= 0) return undefined;
      return {
        newUsers: row.newCount > 0,
        expiredUsers: row.expiredCount > 0,
      };
    },
    [activityByDay],
  );

  const value = useMemo(
    (): ActivityOverviewContextValue => ({
      activityApiBase,
      viewMonth,
      selected,
      showDailyDetail,
      activeDetailDate,
      activityByDay,
      detailPayload,
      detailLoading,
      monthNavigatorTitleDate,
      activeDayKey,
      summaryForActiveDay,
      setViewMonth,
      goToToday,
      selectDay,
      closeDailyDetail,
      getDayMarkers,
    }),
    [
      activityApiBase,
      viewMonth,
      selected,
      showDailyDetail,
      activeDetailDate,
      activityByDay,
      detailPayload,
      detailLoading,
      monthNavigatorTitleDate,
      activeDayKey,
      summaryForActiveDay,
      goToToday,
      selectDay,
      closeDailyDetail,
      getDayMarkers,
    ],
  );

  return <ActivityOverviewContext.Provider value={value}>{children}</ActivityOverviewContext.Provider>;
}

/** HUD activity calendar — render once per visible slot; data loads once in the provider. */
export function AdminActivityCalendarPanel({ className }: { className?: string }) {
  const {
    viewMonth,
    selected,
    showDailyDetail,
    activeDetailDate,
    detailPayload,
    detailLoading,
    monthNavigatorTitleDate,
    summaryForActiveDay,
    setViewMonth,
    goToToday,
    selectDay,
    closeDailyDetail,
    getDayMarkers,
  } = useActivityOverviewContext();

  return (
    <div
      className={cn(
        hudDashShell,
        "flex h-full min-h-0 w-full flex-col overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3",
        className,
      )}
      aria-label="Activity calendar"
    >
      <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="relative min-h-[14rem] w-full flex-1 overflow-hidden sm:min-h-[16rem]">
          <div
            className={cn(
              "flex h-full min-h-0 w-full flex-col transition-all duration-300 ease-out motion-reduce:transition-none",
              showDailyDetail
                ? "pointer-events-none relative z-0 scale-[0.98] opacity-0 blur-[0.5px] motion-reduce:blur-none"
                : "relative z-[1] scale-100 opacity-100 blur-0",
            )}
            aria-hidden={showDailyDetail}
          >
            <HudMonthNavigator
              viewMonth={viewMonth}
              titleDate={monthNavigatorTitleDate}
              onPrev={() => setViewMonth((d) => addMonths(d, -1))}
              onNext={() => setViewMonth((d) => addMonths(d, 1))}
              onToday={goToToday}
            />
            <HudCalendarMonthGrid
              className="mt-2 min-h-0 w-full flex-1 px-0.5 pb-1 sm:mt-3 sm:pb-2"
              viewMonth={viewMonth}
              selected={selected}
              onSelect={selectDay}
              getDayMarkers={getDayMarkers}
            />
          </div>

          <div
            className={cn(
              "flex h-full min-h-0 w-full flex-col overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:translate-y-0",
              showDailyDetail
                ? "absolute inset-0 z-[2] translate-y-0 scale-100 opacity-100"
                : "pointer-events-none absolute inset-0 z-0 translate-y-1 scale-[0.99] opacity-0",
            )}
            aria-hidden={!showDailyDetail}
          >
            <HudDailyActivityDetail
              key={`${activeDetailDate.getFullYear()}-${activeDetailDate.getMonth()}-${activeDetailDate.getDate()}`}
              className="h-full min-h-0 max-h-full"
              date={activeDetailDate}
              newCount={detailPayload?.newCount ?? summaryForActiveDay?.newCount ?? 0}
              expiredCount={detailPayload?.expiredCount ?? summaryForActiveDay?.expiredCount ?? 0}
              newUsers={detailPayload?.newUsers ?? []}
              expiredUsers={detailPayload?.expiredUsers ?? []}
              loading={detailLoading}
              onClose={closeDailyDetail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
