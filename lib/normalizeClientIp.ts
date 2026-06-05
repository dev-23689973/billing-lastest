/** Normalize stored/proxy client IPs for display and DB (IPv4-mapped IPv6, loopback). */
export function normalizeClientIp(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "0.0.0.0") return "";

  const lower = s.toLowerCase();
  if (lower === "::1") return "127.0.0.1";

  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];

  return s.slice(0, 45);
}
