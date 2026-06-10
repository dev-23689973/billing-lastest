import { describe, expect, it } from "vitest";
import { ledgerPrincipalAmount, ledgerTotalAmount } from "@/lib/transactionLedgerAmount";
import { ledgerBonusAmount } from "@/lib/transactionLedgerBonusAmount";
import type { AdminTransactionRow } from "@/lib/repos/billing";

function row(partial: Partial<AdminTransactionRow> & Pick<AdminTransactionRow, "type" | "periods">): AdminTransactionRow {
  return {
    transaction: "1",
    username: "u",
    amount: null,
    account: null,
    coverage_start: null,
    coverage_end: null,
    remarks: null,
    timestamp: null,
    created_by: null,
    free_month: null,
    ...partial,
  };
}

describe("ledgerPrincipalAmount", () => {
  it("uses base credits on hierarchy receive CRDT when promo is split in remarks", () => {
    const r = row({
      type: "CRDT",
      periods: 21_000,
      remarks: "21000 credits received by mgr (base 20000) [grant_meta:p1=1000|p2=0]",
    });
    expect(ledgerPrincipalAmount(r)).toBe(20_000);
    expect(ledgerTotalAmount(r)).toBe(21_000);
  });

  it("uses principal + promo package total on hierarchy send DBIT promo rows", () => {
    const r = row({
      type: "DBIT",
      periods: -5_003,
      account: "dddd",
      remarks:
        "dddd received 5003 credits +213 Promo1 (4%) +0 Promo2 (0%) = 5216 [promo_grant:abc|p1=213|p2=0|pct1=4|pct2=0|ac=2]",
    });
    expect(ledgerPrincipalAmount(r)).toBe(-5_003);
    expect(ledgerBonusAmount(r)).toBe(213);
    expect(ledgerTotalAmount(r)).toBe(-5_216);
  });

  it("splits recover child debit into principal, promo void, and headline total", () => {
    const r = row({
      type: "DBIT",
      periods: -10_460,
      remarks: "10460 credits recovered (10000 refunded, 460 promo void) [recover_of_tx:3] by mmmm",
    });
    expect(ledgerPrincipalAmount(r)).toBe(-10_000);
    expect(ledgerBonusAmount(r)).toBe(460);
    expect(ledgerTotalAmount(r)).toBe(-10_460);
  });

  it("splits recover parent credit using remark headline total", () => {
    const r = row({
      type: "CRDT",
      periods: 5_003,
      account: "dddd",
      remarks: "5216 credits recovered (5003 refunded, 213 promo void) from dddd [recover_of_tx:1]",
    });
    expect(ledgerPrincipalAmount(r)).toBe(5_003);
    expect(ledgerBonusAmount(r)).toBe(213);
    expect(ledgerTotalAmount(r)).toBe(5_216);
  });

  it("leaves plain recover without promo split unchanged", () => {
    const recover = row({
      type: "CRDT",
      periods: 25_000,
      remarks: "25000 credits recovered from dealer1",
    });
    expect(ledgerPrincipalAmount(recover)).toBe(25_000);
    expect(ledgerBonusAmount(recover)).toBeNull();
    expect(ledgerTotalAmount(recover)).toBe(25_000);
  });
});
