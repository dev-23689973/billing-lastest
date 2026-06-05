/** Client-safe staff display helpers (no DB / mysql2 imports). */

import { formatMysqlDateTime } from "@/lib/billingAccountExpiry";
import { normalizeClientIp } from "@/lib/normalizeClientIp";
import { isLoopbackOrPrivateIp } from "@/lib/requestClientIp";

function parseBillingDateTime(raw: unknown): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(normalized);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function normalizeStaffIpDisplayValue(raw: unknown): string {
  return normalizeClientIp(String(raw ?? ""));
}

export function formatStaffIpDisplay(raw: string): string {
  const n = normalizeStaffIpDisplayValue(raw);
  if (!n || isLoopbackOrPrivateIp(n)) return "—";
  return n;
}

export function formatStaffLoginTimeDisplay(raw: string): string {
  const d = parseBillingDateTime(raw);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Details modals — shorter stamp so tiles do not clip on narrow/mobile widths. */
export function formatStaffLoginTimeCompactDisplay(raw: string): string {
  const d = parseBillingDateTime(raw);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Normalize billing `users.created_at` for staff list rows. */
export function normalizeStaffCreatedAtDbValue(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return formatMysqlDateTime(raw);
  }
  const s = String(raw).trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return "";
  const mysqlLike = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (mysqlLike) {
    return mysqlLike[2] ? `${mysqlLike[1]} ${mysqlLike[2]}` : mysqlLike[1];
  }
  const d = parseBillingDateTime(s);
  return d ? formatMysqlDateTime(d) : "";
}

/** UI label for staff **Created** column. */
export function formatStaffCreatedAtDisplay(raw: string): string {
  const norm = normalizeStaffCreatedAtDbValue(raw);
  if (!norm) return "—";
  const d = parseBillingDateTime(norm);
  if (!d) return norm;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
