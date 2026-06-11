import { describe, expect, it } from "vitest";
import {
  aggregateLedgerRows,
  formatLedgerAccountLabel,
  parsePromoGrantBlock,
  parseTransactionMeta,
  reconcileLedgerTotals,
  resolveLedgerDisplayTotals,
  walletBalanceFromLedgerRows,
} from "./transactionLedgerAnalytics";
import type { AdminTransactionRow } from "@/lib/repos/billing";

describe("parsePromoGrantBlock", () => {
  it("parses promo_grant tag from owner DBIT remarks", () => {
    const raw =
      "reseller1 received 110 credits +10 Promo1 (10%) +0 Promo2 (0%) = 110 [promo_grant:abc|p1=10|p2=0|pct1=10|pct2=0|ac=5]";
    expect(parsePromoGrantBlock(raw)).toEqual({
      p1: 10,
      p2: 0,
      pct1: 10,
      pct2: 0,
      activeClients: 5,
    });
  });
});

describe("parseTransactionMeta", () => {
  it("classifies hierarchy credit with grant_meta", () => {
    const row: AdminTransactionRow = {
      transaction: "42",
      username: "reseller1",
      type: "CRDT",
      periods: -110,
      amount: null,
      account: null,
      coverage_start: null,
      coverage_end: null,
      remarks: "110 credits received by admin (base 100) [grant_meta:p1=10|p2=0]",
      free_month: 0,
      timestamp: "2026-05-01 12:00:00",
      created_by: null,
    };
    const meta = parseTransactionMeta(row);
    expect(meta.category).toBe("hierarchy_credit");
    expect(meta.baseCredits).toBe(100);
    expect(meta.promo1).toBe(10);
    expect(meta.promo2).toBe(0);
  });
});

describe("aggregateLedgerRows", () => {
  it("sums wallet-signed credits in and out so in minus out equals balance", () => {
    const rows: AdminTransactionRow[] = [
      {
        transaction: "1",
        username: "admin",
        type: "CRDT",
        periods: -50,
        amount: null,
        account: null,
        coverage_start: null,
        coverage_end: null,
        remarks: "grant",
        free_month: 0,
        timestamp: "2026-05-10 10:00:00",
        created_by: null,
      },
      {
        transaction: "2",
        username: "admin",
        type: "DBIT",
        periods: 30,
        amount: null,
        account: "user1",
        coverage_start: "2026-05-10",
        coverage_end: "2026-06-10",
        remarks: "renew",
        free_month: 1,
        timestamp: "2026-05-11 10:00:00",
        created_by: null,
      },
    ];
    const agg = aggregateLedgerRows(rows);
    expect(agg.creditsIn).toBe(50);
    expect(agg.creditsOut).toBe(30);
    expect(agg.net).toBe(20);
    expect(agg.rowCount).toBe(2);
    expect(walletBalanceFromLedgerRows(rows)).toBe(20);
    expect(agg.creditsIn - agg.creditsOut).toBe(agg.net);
  });

  it("counts wallet debits by signed effect, not only DBIT/SUBDBIT/BONUS types", () => {
    const rows: AdminTransactionRow[] = [
      {
        transaction: "1",
        username: "jun2",
        type: "CRDT",
        periods: -100,
        amount: null,
        account: null,
        coverage_start: null,
        coverage_end: null,
        remarks: "grant",
        free_month: 0,
        timestamp: "2026-05-10 10:00:00",
        created_by: null,
      },
      {
        transaction: "2",
        username: "jun2",
        type: "OTHER",
        periods: 48,
        amount: null,
        account: "sub1",
        coverage_start: null,
        coverage_end: null,
        remarks: "legacy debit",
        free_month: 0,
        timestamp: "2026-05-11 10:00:00",
        created_by: null,
      },
    ];
    const agg = aggregateLedgerRows(rows);
    expect(agg.creditsIn).toBe(100);
    expect(agg.creditsOut).toBe(48);
    expect(agg.net).toBe(52);
  });
});

describe("reconcileLedgerTotals", () => {
  it("derives out from in and wallet so in minus out equals available", () => {
    const totals = reconcileLedgerTotals(
      { creditsIn: 11373, creditsOut: 10358, net: 1015 },
      967,
      true,
    );
    expect(totals.creditsIn).toBe(11373);
    expect(totals.creditsOut).toBe(10406);
    expect(totals.available).toBe(967);
    expect(totals.net).toBe(967);
    expect(totals.creditsIn - totals.creditsOut).toBe(totals.available);
  });

  it("leaves period totals unchanged when not reconciling with wallet", () => {
    const totals = reconcileLedgerTotals(
      { creditsIn: 500, creditsOut: 200, net: 300 },
      967,
      false,
    );
    expect(totals.creditsOut).toBe(200);
    expect(totals.net).toBe(300);
    expect(totals.available).toBe(967);
    expect(totals.reconciled).toBe(false);
  });
});

describe("formatLedgerAccountLabel", () => {
  it("shows display name with username when they differ", () => {
    expect(formatLedgerAccountLabel("admin", "ZAAPTV4K")).toBe("ZAAPTV4K (admin)");
  });

  it("shows username only when display name matches", () => {
    expect(formatLedgerAccountLabel("admin", "admin")).toBe("admin");
  });
});

describe("resolveLedgerDisplayTotals", () => {
  const stats = { creditsIn: 32000, creditsOut: 60668, net: -28668 };

  it("uses period flow for admin and hides wallet balance semantics", () => {
    const totals = resolveLedgerDisplayTotals(stats, -1069102, false, true, "7 days");
    expect(totals.mode).toBe("admin");
    expect(totals.showUnlimitedAccess).toBe(true);
    expect(totals.net).toBe(-28668);
    expect(totals.available).toBe(-28668);
    expect(totals.heroLabel).toBe("Period net (7 days)");
    expect(totals.creditsOut).toBe(60668);
  });

  it("keeps wallet reconciliation for non-admin operators", () => {
    const totals = resolveLedgerDisplayTotals(stats, 967, false, false, "7 days");
    expect(totals.mode).toBe("wallet");
    expect(totals.showUnlimitedAccess).toBe(false);
    expect(totals.available).toBe(967);
    expect(totals.heroLabel).toBe("Available credits");
  });
});
