"use client";

import { useEffect, useState } from "react";

/**
 * Defer mounting heavy client UI (WebGL, large charts) until after first paint / idle.
 */
export function useDeferClientMount(enabled = true, timeoutMs = 2000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    const run = () => setReady(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: timeoutMs });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 120);
    return () => clearTimeout(id);
  }, [enabled, timeoutMs]);

  return ready;
}
