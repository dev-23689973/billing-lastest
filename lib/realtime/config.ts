export type RealtimePublicConfig = {
  key: string;
  cluster: string;
};

/** Server-side: public Pusher key/cluster for the browser (key is not secret). */
export function getRealtimePublicConfig(): RealtimePublicConfig | null {
  const key =
    process.env.NEXT_PUBLIC_PUSHER_KEY?.trim() ||
    process.env.PUSHER_KEY?.trim() ||
    "";
  const cluster =
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() ||
    process.env.PUSHER_CLUSTER?.trim() ||
    "";
  if (!key || !cluster) return null;
  return { key, cluster };
}

export function isRealtimeServerConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID?.trim() &&
      process.env.PUSHER_KEY?.trim() &&
      process.env.PUSHER_SECRET?.trim() &&
      process.env.PUSHER_CLUSTER?.trim(),
  );
}

export function isRealtimeClientConfigured(config?: RealtimePublicConfig | null): boolean {
  const key = config?.key?.trim() || process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const cluster = config?.cluster?.trim() || process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
  return Boolean(key && cluster);
}
