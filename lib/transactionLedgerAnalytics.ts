import { SUBSCRIBER_TX_CREDIT, SUBSCRIBER_TX_DEBIT } from "@/lib/billing/subscriberTransactionTypes";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { parseHierarchyGrantBaseCredits, parseHierarchyGrantMetaPromos } from "@/lib/hierarchyGrantRemark";

export type LedgerPeriodId = "7d" | "30d" | "all";

export type TransactionLedgerCategory =
  | "promo_grant"
  | "hierarchy_credit"
  | "hierarchy_send"
  | "recover"
  | "subscriber"
  | "bonus"
  | "other";

export type ParsedTransactionMeta = {
  category: TransactionLedgerCategory;
  categoryLabel: string;
  creditMagnitude: number;
  signedEffect: number;
  baseCredits: number | null;
  promo1: number;
  promo2: number;
  promoPct1: number | null;
  promoPct2: number | null;
  promoActiveClients: number | null;
  recoverOfTx: number | null;
  hasPromoGrantTag: boolean;
};

export type LedgerAggregate = {
  rowCount: number;
  creditsIn: number;
  creditsOut: number;
  net: number;
  promo1Total: number;
  promo2Total: number;
  promoCombinedTotal: number;
  baseCreditsTotal: number;
  grantCount: number;
  recoverCount: number;
  subscriberDebitCount: number;
  byCategory: Record<TransactionLedgerCategory, { count: number; credits: number }>;
};

const CATEGORY_LABELS: Record<TransactionLedgerCategory, string> = {
  promo_grant: "Promo grant",
  hierarchy_credit: "Hierarchy · received",
  hierarchy_send: "Hierarchy · sent",
  recover: "Recover / reversal",
  subscriber: "Subscriber renew",
  bonus: "Bonus",
  other: "Other",
};

export const CATEGORY_SHORT_LABELS: Record<TransactionLedgerCategory, string> = {
  promo_grant: "Promo",
  hierarchy_credit: "In",
  hierarchy_send: "Out",
  recover: "Rv",
  subscriber: "Sub",
  bonus: "Bon",
  other: "—",
};

const PROMO_GRANT_RE =
  /\[promo_grant:[^\]]*\|p1=(\d+)\|p2=(\d+)(?:\|pct1=([\d.]+))?(?:\|pct2=([\d.]+))?(?:\|ac=(\d+))?\]/i;

const RECOVER_OF_TX_RE = /\[recover_of_tx:(\d+)\]/i;

export function parsePromoGrantBlock(remarks: string | null | undefined): {
  p1: number;
  p2: number;
  pct1: number | null;
  pct2: number | null;
  activeClients: number | null;
} | null {
  if (!remarks) return null;
  const m = String(remarks).match(PROMO_GRANT_RE);
  if (!m) return null;
  const p1 = Math.floor(Number(m[1]));
  const p2 = Math.floor(Number(m[2]));
  if (!Number.isFinite(p1) || !Number.isFinite(p2)) return null;
  const pct1 = m[3] != null ? Number(m[3]) : null;
  const pct2 = m[4] != null ? Number(m[4]) : null;
  const ac = m[5] != null ? Math.floor(Number(m[5])) : null;
  return {
    p1: Math.max(0, p1),
    p2: Math.max(0, p2),
    pct1: pct1 != null && Number.isFinite(pct1) ? pct1 : null,
    pct2: pct2 != null && Number.isFinite(pct2) ? pct2 : null,
    activeClients: ac != null && Number.isFinite(ac) ? ac : null,
  };
}

export function parseRecoverOfTx(remarks: string | null | undefined): number | null {
  if (!remarks) return null;
  const m = String(remarks).match(RECOVER_OF_TX_RE);
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Admin list rows flip CRDT sign in `periods`; wallet math uses `-periods`. */
export function signedLedgerEffect(row: AdminTransactionRow): number {
  return -row.periods;
}

/** Sum wallet effects on ledger rows (matches `getCreditBalance` when all rows are loaded). */
export function walletBalanceFromLedgerRows(rows: ReadonlyArray<AdminTransactionRow>): number {
  return rows.reduce((sum, row) => sum + signedLedgerEffect(row), 0);
}

export function creditMagnitude(row: AdminTransactionRow): number {
  return Math.abs(row.periods);
}

export function classifyTransaction(row: AdminTransactionRow): TransactionLedgerCategory {
  const type = row.type.toUpperCase();
  const remarks = row.remarks ?? "";
  const rm = remarks.toLowerCase();
  const ac = (row.account ?? "").trim();

  if (parseRecoverOfTx(remarks) != null || /\brecovered\s+from\b/.test(rm)) return "recover";
  if (type === "BONUS") return "bonus";
  if (parsePromoGrantBlock(remarks) != null) return "promo_grant";
  if (type === "CRDT" && parseHierarchyGrantBaseCredits(remarks) != null) return "hierarchy_credit";
  if (type === "DBIT" && ac && /\breceived\s+\d+\s+credits/.test(rm)) return "hierarchy_send";
  if (type === SUBSCRIBER_TX_DEBIT || type === SUBSCRIBER_TX_CREDIT) return "subscriber";
  if (ac && (row.coverage_start || row.coverage_end || /\brenew|\baccount\b/i.test(rm))) return "subscriber";
  if (type === "DBIT" && ac) return "subscriber";
  if (type === "CRDT") return "hierarchy_credit";
  return "other";
}

export function parseTransactionMeta(row: AdminTransactionRow): ParsedTransactionMeta {
  const remarks = row.remarks ?? "";
  const category = classifyTransaction(row);
  const grant = parsePromoGrantBlock(remarks);
  const meta = parseHierarchyGrantMetaPromos(remarks);
  const base = parseHierarchyGrantBaseCredits(remarks);
  const mag = creditMagnitude(row);

  let promo1 = grant?.p1 ?? meta?.p1 ?? 0;
  let promo2 = grant?.p2 ?? meta?.p2 ?? 0;

  if (!grant && !meta && category === "hierarchy_credit" && base != null && mag > base) {
    promo1 = 0;
    promo2 = 0;
  }

  return {
    category,
    categoryLabel: CATEGORY_LABELS[category],
    creditMagnitude: mag,
    signedEffect: signedLedgerEffect(row),
    baseCredits: base,
    promo1,
    promo2,
    promoPct1: grant?.pct1 ?? null,
    promoPct2: grant?.pct2 ?? null,
    promoActiveClients: grant?.activeClients ?? null,
    recoverOfTx: parseRecoverOfTx(remarks),
    hasPromoGrantTag: grant != null,
  };
}

export function parseRowDate(ts: string | null): Date | null {
  if (!ts) return null;
  const d = new Date(ts.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function inLastNDays(d: Date | null, n: number): boolean {
  if (!d) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (n - 1));
  return d.getTime() >= start.getTime();
}

export function filterRowsByPeriod(rows: AdminTransactionRow[], period: LedgerPeriodId): AdminTransactionRow[] {
  if (period === "all") return rows;
  const days = period === "7d" ? 7 : 30;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return rows.filter((r) => {
    const d = parseRowDate(r.timestamp);
    if (!d) return false;
    const t = d.getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

export function aggregateLedgerRows(rows: AdminTransactionRow[]): LedgerAggregate {
  const byCategory = {} as LedgerAggregate["byCategory"];
  for (const key of Object.keys(CATEGORY_LABELS) as TransactionLedgerCategory[]) {
    byCategory[key] = { count: 0, credits: 0 };
  }

  let creditsIn = 0;
  let creditsOut = 0;
  let promo1Total = 0;
  let promo2Total = 0;
  let baseCreditsTotal = 0;
  let grantCount = 0;
  let recoverCount = 0;
  let subscriberDebitCount = 0;

  for (const row of rows) {
    const meta = parseTransactionMeta(row);
    const type = row.type.toUpperCase();
    const walletEffect = signedLedgerEffect(row);
    if (walletEffect > 0) creditsIn += walletEffect;
    else if (walletEffect < 0) creditsOut += -walletEffect;

    byCategory[meta.category].count += 1;
    byCategory[meta.category].credits += meta.creditMagnitude;

    if (meta.hasPromoGrantTag || meta.promo1 > 0 || meta.promo2 > 0) {
      promo1Total += meta.promo1;
      promo2Total += meta.promo2;
      grantCount += 1;
    }
    if (meta.baseCredits != null) baseCreditsTotal += meta.baseCredits;
    if (meta.recoverOfTx != null || meta.category === "recover") recoverCount += 1;
    if (meta.category === "subscriber" && (type === "DBIT" || type === SUBSCRIBER_TX_DEBIT)) subscriberDebitCount += 1;
  }

  return {
    rowCount: rows.length,
    creditsIn,
    creditsOut,
    net: creditsIn - creditsOut,
    promo1Total,
    promo2Total,
    promoCombinedTotal: promo1Total + promo2Total,
    baseCreditsTotal,
    grantCount,
    recoverCount,
    subscriberDebitCount,
    byCategory,
  };
}

export type ReconciledLedgerTotals = {
  creditsIn: number;
  creditsOut: number;
  available: number;
  net: number;
  reconciled: boolean;
};

/**
 * Footer / summary totals aligned with wallet balance.
 * When `reconcileWithWallet` is true, out is derived so in − out = available (wallet).
 */
export function reconcileLedgerTotals(
  stats: Pick<LedgerAggregate, "creditsIn" | "creditsOut" | "net">,
  walletBalance: number,
  reconcileWithWallet: boolean,
): ReconciledLedgerTotals {
  const creditsIn = stats.creditsIn;
  const available = walletBalance;
  if (!reconcileWithWallet) {
    return {
      creditsIn,
      creditsOut: stats.creditsOut,
      available,
      net: stats.net,
      reconciled: false,
    };
  }
  const creditsOut = Math.max(0, creditsIn - available);
  return {
    creditsIn,
    creditsOut,
    available,
    net: available,
    reconciled: true,
  };
}

/** Day-over-day % for insights; caps when prior day ≈ 0. */
export function formatInsightsDayOverDayPct(current: number, previous: number): string {
  if (previous < 1 && current < 1) return "0.0";
  if (previous < 1) return current >= 1 ? "new activity" : "0.0";
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct)) return "—";
  const capped = Math.max(-999, Math.min(999, pct));
  const sign = capped >= 0 ? "+" : "";
  return `${sign}${capped.toFixed(1)}`;
}

/** Human trend line; caps absurd % when prior period ≈ 0. */
export function formatLedgerTrendPct(current: number, previous: number): string | undefined {
  if (previous < 1 && current < 1) return "Flat vs prior period";
  if (previous < 1) return `Up from ${Math.round(previous)} (prior period minimal)`;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct)) return undefined;
  const capped = Math.max(-999, Math.min(999, pct));
  const sign = capped >= 0 ? "+" : "";
  return `${sign}${capped.toFixed(1)}% vs prior period`;
}
