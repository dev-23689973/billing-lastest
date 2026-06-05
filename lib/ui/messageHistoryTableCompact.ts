import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  embeddedTablePillTextClass,
  embeddedTableTdClass,
  embeddedTableTextClass,
  embeddedTableThClass,
} from "@/lib/ui/embeddedTableTypography";

/** Content-width table — matches AdminSubscribersTable embedded (users page) density. */
export const messageHistoryEmbeddedTableClass = cn(
  "w-max min-w-full max-w-full table-auto border-collapse text-left tabular-nums",
  embeddedTableTextClass,
);

/** Shrink-to-content column — pair with whitespace-nowrap on cells. */
export const messageHistoryEmbeddedTightColClass = "w-0 whitespace-nowrap";

/** Row spacing aligned with users list tables. */
export const messageHistoryEmbeddedRowClass =
  "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/15 dark:border-border/35";

export function messageHistoryEmbeddedTh(extra?: string) {
  return dataTableStickyTh(cn(messageHistoryEmbeddedTightColClass, embeddedTableThClass(extra)));
}

export function messageHistoryEmbeddedTd(
  extra?: string,
  { truncate = true }: { truncate?: boolean } = {},
) {
  return cn(
    messageHistoryEmbeddedTightColClass,
    embeddedTableTdClass(extra),
    truncate && "max-w-[12rem] truncate",
  );
}

/** Inline badge/pill sizing for embedded message & ticket tables. */
export const messageHistoryEmbeddedPillClass = cn(
  "inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 font-semibold leading-tight",
  embeddedTablePillTextClass,
);

export function messageHistoryPreviewShort(text: string, max = 14): string {
  const t = text.trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function messageHistoryTimestampShort(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s) && s.length >= 16) return s.slice(5, 16);
  if (s.length > 11) return `${s.slice(0, 11)}…`;
  return s;
}

export function messageHistorySentByShort(label: string): string {
  const t = label.trim();
  if (!t) return "—";
  if (t.length <= 6) return t;
  if (/^admin/i.test(t)) return "Admin";
  return `${t.slice(0, 5)}…`;
}

export function messageHistoryRecipientShort(login: string | null | undefined, uid: number): string {
  const id = login?.trim() || `uid:${uid}`;
  return id.length > 8 ? `${id.slice(0, 7)}…` : id;
}

export function messageHistoryAudienceShort(audienceType: string): string {
  switch (audienceType) {
    case "all_staff":
      return "All";
    case "managers":
      return "Mgr";
    case "resellers":
      return "Rslr";
    case "dealers":
      return "Dlr";
    case "downstream_all":
      return "Down";
    case "downstream_resellers":
      return "Rslr";
    case "downstream_dealers":
      return "Dlr";
    case "custom":
      return "Cust";
    default:
      return audienceType.length > 6 ? `${audienceType.slice(0, 5)}…` : audienceType.replace(/_/g, " ");
  }
}
