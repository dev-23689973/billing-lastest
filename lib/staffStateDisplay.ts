/** Parse billing datetime strings for optional "last login" footnote when offline. */
export function parseBillingDateTime(raw: string): Date | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "—" || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

export function pickLastLoginDate(currentRaw: string, lastRaw: string): Date | null {
  const current = parseBillingDateTime(currentRaw);
  const last = parseBillingDateTime(lastRaw);
  if (current && last) return current.getTime() >= last.getTime() ? current : last;
  return current ?? last;
}

/** Full stamp for tooltips and exports. */
export function formatStateLastSeen(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** STATE column table line (e.g. `May 25, 5:48 PM`). */
export function formatStateShortDate(d: Date): string {
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (d.getFullYear() !== now.getFullYear()) {
    opts.year = "2-digit";
  }
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}
