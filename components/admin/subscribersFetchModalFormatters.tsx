import { ReceiverOnlineIconBadge } from "@/components/admin/HierarchyTableBadges";
import { cn } from "@/lib/cn";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";

const ACCOUNT_OFF = 1;

export type SubscribersHierarchyColumnMode = "hidden" | "dealer" | "dealer-reseller" | "full";

export function statusLabel(r: SubscriberListClientRow): string {
  if (r.status === ACCOUNT_OFF) return "Inactive";
  return "Active";
}

export function expiryState(raw: string | null): "Live" | "Expiring" | "Expired" | null {
  if (!raw) return null;
  const parsed = Date.parse(String(raw).replace(" ", "T"));
  if (Number.isNaN(parsed)) return null;
  const delta = parsed - Date.now();
  if (delta < 0) return "Expired";
  if (delta <= 7 * 24 * 60 * 60 * 1000) return "Expiring";
  return "Live";
}

export function formatExpiryShort(raw: string | null, compact = false): string {
  if (!raw) return "—";
  const parsed = Date.parse(String(raw).replace(" ", "T"));
  if (Number.isNaN(parsed)) return raw;
  const d = new Date(parsed);
  if (compact) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const t = Date.parse(String(raw).includes("T") ? String(raw) : String(raw).replace(" ", "T"));
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

export function formatRelative(raw: string | null): string {
  const d = parseDate(raw);
  if (!d) return "No activity";
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function relativeTone(raw: string | null): string {
  const d = parseDate(raw);
  if (!d) return "text-rose-600 dark:text-rose-400";
  const ageMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ageMs < 7 * day) return "text-emerald-700 dark:text-emerald-300";
  if (ageMs >= 365 * day) return "text-rose-600 dark:text-rose-400";
  if (ageMs >= 180 * day) return "text-orange-600 dark:text-orange-400";
  if (ageMs >= 90 * day) return "text-amber-600 dark:text-amber-300";
  return "text-slate-700 dark:text-slate-200";
}

export function hierarchySortText(r: SubscriberListClientRow, mode: SubscribersHierarchyColumnMode) {
  const dealer = String(r.dealer ?? "").toLowerCase();
  if (mode === "hidden" || mode === "dealer") return dealer;
  const reseller = String(r.reseller ?? "").toLowerCase();
  if (mode === "dealer-reseller") return `${dealer}/${reseller}`;
  return `${dealer}/${reseller}/${String(r.manager ?? "").toLowerCase()}`;
}

export function HierarchyCell({ row, mode }: { row: SubscriberListClientRow; mode: SubscribersHierarchyColumnMode }) {
  if (mode === "dealer") {
    return <span className="text-amber-700 dark:text-amber-200">{row.dealer || "-"}</span>;
  }
  return (
    <>
      <span className="text-amber-700 dark:text-amber-200">{row.dealer || "-"}</span>
      {mode === "dealer-reseller" || mode === "full" ? (
        <>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="text-sky-700 dark:text-sky-200">{row.reseller || "-"}</span>
        </>
      ) : null}
      {mode === "full" ? (
        <>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="text-violet-700 dark:text-violet-200">{row.manager || "-"}</span>
        </>
      ) : null}
    </>
  );
}

export function StatusBadge({ r }: { r: SubscriberListClientRow }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 sm:text-[11px]",
        statusLabel(r) === "Active"
          ? "border border-emerald-300 bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
          : "border border-rose-300 bg-rose-100 text-rose-800 ring-rose-200/80 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
      )}
    >
      <span className="md:hidden">{statusLabel(r) === "Active" ? "On" : "Off"}</span>
      <span className="hidden md:inline">{statusLabel(r)}</span>
    </span>
  );
}

export function DeviceCell({ r }: { r: SubscriberListClientRow }) {
  return (
    <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
      <ReceiverOnlineIconBadge online={r.receiverOnline} />
      <span className={cn("min-w-0 whitespace-nowrap text-[11px] sm:text-xs", relativeTone(r.lastActive))}>
        {formatRelative(r.lastActive)}
      </span>
    </span>
  );
}
