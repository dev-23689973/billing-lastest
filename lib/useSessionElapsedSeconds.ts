"use client";

import { useEffect, useState } from "react";

/** Matches legacy session timer storage key (`billing.sessionStartedAt`). */
export const SESSION_STARTED_AT_KEY = "billing-panel-session-started-at";

/** Elapsed seconds since tab session anchor (sessionStorage), ticking every second. */
export function useSessionElapsedSeconds(): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let start = sessionStorage.getItem(SESSION_STARTED_AT_KEY);
    if (!start || Number.isNaN(Number(start))) {
      start = String(Date.now());
      sessionStorage.setItem(SESSION_STARTED_AT_KEY, start);
    }
    const t0 = Number(start);
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return elapsed;
}
