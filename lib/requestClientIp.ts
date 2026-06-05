import { normalizeClientIp } from "@/lib/normalizeClientIp";

/** Set by `proxy.ts` from the incoming request (trusted internal). */
export const APP_CLIENT_IP_HEADER = "x-app-client-ip";

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return null;
  return parts as [number, number, number, number];
}

/** True for loopback, link-local, and RFC1918 — not useful as a “real client” IP in UI. */
export function isLoopbackOrPrivateIp(ip: string): boolean {
  const n = normalizeClientIp(ip);
  if (!n) return true;
  if (n === "127.0.0.1") return true;
  const lower = n.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;

  const v4 = parseIpv4(n);
  if (!v4) return false;
  const [a, b] = v4;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function parseForwardedHeader(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const entry of raw.split(",")) {
    const m = entry.match(/for=(?:"?\[?)([^";\s,\]]+)/i);
    if (m?.[1]) out.push(m[1].trim());
  }
  return out;
}

function candidatesFromHeaders(headers: Headers): string[] {
  const out: string[] = [];
  const singles = [
    APP_CLIENT_IP_HEADER,
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "fastly-client-ip",
    "x-vercel-forwarded-for",
  ];
  for (const name of singles) {
    const v = headers.get(name)?.trim();
    if (v) out.push(v);
  }
  out.push(...parseForwardedHeader(headers.get("forwarded")));
  const xff = headers.get("x-forwarded-for");
  if (xff) out.push(...xff.split(",").map((p) => p.trim()));
  return out;
}

/** Prefer the first public IP in the chain; skip loopback/private when a routable address exists. */
export function pickBestClientIp(candidates: string[]): string | null {
  const normalized = candidates.map((c) => normalizeClientIp(c)).filter(Boolean);
  const pub = normalized.find((ip) => !isLoopbackOrPrivateIp(ip));
  if (pub) return pub;
  return normalized[0] ?? null;
}

/** Client IP for billing `users` login columns (proxy-aware). */
export function getClientIpFromHeaders(headers: Headers): string | null {
  const best = pickBestClientIp(candidatesFromHeaders(headers));
  if (best && !isLoopbackOrPrivateIp(best)) return best;
  return null;
}

/** Validates a client-reported or form-supplied IPv4/IPv6 (public only). */
export function parsePublicIpCandidate(raw: unknown): string | null {
  const n = normalizeClientIp(String(raw ?? "").trim());
  if (!n || isLoopbackOrPrivateIp(n)) return null;
  return n;
}

/** Resolve client IP on the Edge/middleware request (includes `NextRequest.ip` when set). */
export function getClientIpFromRequest(request: { headers: Headers; ip?: string | null }): string | null {
  const candidates = candidatesFromHeaders(request.headers);
  if (request.ip) candidates.unshift(request.ip);
  const best = pickBestClientIp(candidates);
  if (best && !isLoopbackOrPrivateIp(best)) return best;
  return null;
}
