import type { AccountTransactionRow } from "@/lib/repos/billing";
import { formatTransactionRemarksForDisplay } from "@/lib/formatTransactionRemarks";
import { cn } from "@/lib/cn";
import { isDebitType } from "@/lib/transactionTypeDisplay";
import { TransactionTypeBadge } from "@/components/transactions/TransactionTypeBadge";

export function dash(v: string | null | undefined) {
  if (v == null || v === "") return "—";
  return v;
}

export function formatTxnDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const short = `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${time}`;
  return { date, time, compact: `${date} · ${time}`, short };
}

export function normalizeTxnRemarks(raw: string | null | undefined) {
  const text = formatTransactionRemarksForDisplay(raw);
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  const transferMatch = cleaned.match(/^Credit From:\s*(.+?)\s+To:\s*(.+)$/i);
  if (transferMatch) {
    return `Transfer ${transferMatch[1].trim()} -> ${transferMatch[2].trim()}`;
  }
  return cleaned.replace(/:\s*/g, ": ");
}

export function txnMonthsCell(r: AccountTransactionRow) {
  if (isDebitType(r.type)) return String(r.periods);
  if (r.free_month != null) return String(r.free_month);
  return "—";
}

export function txnCreditsCell(periods: number) {
  if (periods === 0) return <span className="font-mono text-muted-foreground">0</span>;
  const cls = periods < 0 ? "text-rose-300" : "text-emerald-300";
  return <span className={cn("font-mono font-semibold tabular-nums", cls)}>{periods}</span>;
}

export function formatCoverageDate(value: string | null | undefined, compact = false) {
  if (!value) return null;
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  if (compact) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export type TransactionColumnKey =
  | "type"
  | "credits"
  | "months"
  | "account"
  | "coverageStart"
  | "coverageEnd"
  | "remarks"
  | "timestamp";

export const TRANSACTION_TABLE_COLUMNS: { key: TransactionColumnKey; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "credits", label: "Credits" },
  { key: "months", label: "Months" },
  { key: "account", label: "Sub-account" },
  { key: "coverageStart", label: "Coverage start" },
  { key: "coverageEnd", label: "Coverage end" },
  { key: "remarks", label: "Remarks" },
  { key: "timestamp", label: "Date / time" },
];

export function renderTransactionColumnCell(key: TransactionColumnKey, r: AccountTransactionRow, tight = true) {
  switch (key) {
    case "type":
      return <TransactionTypeBadge type={r.type} size="sm" />;
    case "credits":
      return txnCreditsCell(r.periods);
    case "months":
      return <span className="tabular-nums text-foreground">{txnMonthsCell(r)}</span>;
    case "account":
      return (
        <span
          className="block min-w-0 max-w-full truncate font-mono text-foreground"
          title={r.account?.trim() || undefined}
        >
          {dash(r.account)}
        </span>
      );
    case "coverageStart": {
      const label = formatCoverageDate(r.coverage_start, tight);
      const full = formatCoverageDate(r.coverage_start);
      if (!label) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="whitespace-nowrap tabular-nums" title={full ?? label}>
          {label}
        </span>
      );
    }
    case "coverageEnd": {
      const label = formatCoverageDate(r.coverage_end, tight);
      const full = formatCoverageDate(r.coverage_end);
      if (!label) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="whitespace-nowrap tabular-nums" title={full ?? label}>
          {label}
        </span>
      );
    }
    case "remarks":
      return (
        <span
          className="block min-w-0 max-w-full truncate text-foreground"
          title={normalizeTxnRemarks(r.remarks) || undefined}
        >
          {dash(normalizeTxnRemarks(r.remarks))}
        </span>
      );
    case "timestamp": {
      const dt = formatTxnDateTime(r.timestamp);
      if (typeof dt === "string") {
        return <span className="whitespace-nowrap text-muted-foreground">{dt}</span>;
      }
      return (
        <span className="whitespace-nowrap tabular-nums" title={dt.compact}>
          {dt.short}
        </span>
      );
    }
    default:
      return null;
  }
}
