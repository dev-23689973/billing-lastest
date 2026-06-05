import { describe, expect, it } from "vitest";
import { ledgerBonusAmount } from "@/lib/transactionLedgerBonusAmount";
import type { AdminTransactionRow } from "@/lib/repos/billing";

function row(partial: Partial<AdminTransactionRow> & Pick<AdminTransactionRow, "type" | "periods">): AdminTransactionRow {
  return {
    transaction: "1",
    username: "u",
    amount: null,
    account: "acct",
    coverage_start: null,
    coverage_end: null,
    remarks: null,
    timestamp: null,
    created_by: null,
    free_month: null,
    ...partial,
  };
}

describe("ledgerBonusAmount", () => {
  it("uses free_month on subscriber debit rows (legacy DBIT and SUBDBIT)", () => {
    expect(ledgerBonusAmount(row({ type: "DBIT", periods: -17, free_month: 7, account: "host" }))).toBe(7);
    expect(ledgerBonusAmount(row({ type: "SUBDBIT", periods: -17, free_month: 7, account: "host" }))).toBe(7);
    expect(ledgerBonusAmount(row({ type: "BONUS", periods: 0, free_month: 7, account: "host" }))).toBe(7);
  });

  it("uses promo meta on hierarchy CRDT", () => {
    expect(
      ledgerBonusAmount(
        row({
          type: "CRDT",
          periods: 1020,
          remarks: "1020 credits received by admin (base 1000) [grant_meta:p1=20|p2=0]",
        }),
      ),
    ).toBe(20);
  });
});
