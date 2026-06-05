/** Dev-only timing helpers for dashboard load profiling (see server terminal). */
export async function timeDashboardLoad<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "development") return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    console.info(`[dashboard] ${label}: ${ms}ms`);
  }
}
