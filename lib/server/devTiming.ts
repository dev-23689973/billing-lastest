/** Lightweight server timing logs (disabled unless dev or PERF_TIMING=1). */
export async function timeServerLoad<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const enabled = process.env.NODE_ENV === "development" || process.env.PERF_TIMING === "1";
  if (!enabled) return fn();
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - start;
    console.info(`[perf] ${label}: ${ms}ms`);
  }
}
