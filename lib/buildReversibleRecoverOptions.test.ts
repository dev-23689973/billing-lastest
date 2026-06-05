import { describe, expect, it } from "vitest";
import {
  appendWalletSurplusRecoverOption,
  buildReversibleRecoverOptions,
  buildWalletBalanceRecoverOption,
  hierarchyGrantPrincipalSpent,
  hierarchyRecoverablePrincipalRefund,
  hierarchyRecoverWalletSlice,
} from "@/lib/billing/hierarchyRecover";
import { applyLegacyUntaggedRecoverFifo } from "@/lib/repos/billing";
import type { HierarchyReversibleGrant } from "@/lib/billing/hierarchyRecover";
import { WALLET_BALANCE_RECOVER_GRANT_TX_ID } from "@/lib/constants/hierarchyCredits";

function g(id: number, total: number, base = total): HierarchyReversibleGrant {
  const b = Math.min(base, total);
  const promo = Math.max(0, total - b);
  return {
    grantTxId: id,
    creditedAt: `2026-01-${String(id).padStart(2, "0")}`,
    base: b,
    promo1: promo > 0 ? promo : 0,
    promo2: 0,
    total,
  };
}

describe("buildWalletBalanceRecoverOption", () => {
  it("exposes full wallet balance for recover dropdown", () => {
    const row = buildWalletBalanceRecoverOption(276);
    expect(row.grantTxId).toBe(WALLET_BALANCE_RECOVER_GRANT_TX_ID);
    expect(row.recoverableAmount).toBe(276);
    expect(row.walletDebitAmount).toBe(276);
    expect(row.walletBalanceOnly).toBe(true);
  });
});

describe("appendWalletSurplusRecoverOption", () => {
  it("adds wallet row for balance not covered by tagged grants", () => {
    const grants = [g(1, 26_500, 25_000)];
    const options = buildReversibleRecoverOptions(grants, 27_786);
    const withSurplus = appendWalletSurplusRecoverOption(options, grants, 27_786);
    expect(withSurplus).toHaveLength(2);
    expect(withSurplus[0]!.recoverableAmount).toBe(25_000);
    expect(withSurplus[0]!.walletDebitAmount).toBe(26_500);
    expect(withSurplus[1]!.walletBalanceOnly).toBe(true);
    expect(withSurplus[1]!.recoverableAmount).toBe(1_286);
  });

  it("does not duplicate when wallet row already present", () => {
    const wallet = buildWalletBalanceRecoverOption(500);
    const withSurplus = appendWalletSurplusRecoverOption([wallet], [], 500);
    expect(withSurplus).toHaveLength(1);
  });
});

describe("hierarchyRecoverWalletSlice (principal-first spend)", () => {
  const grant = { base: 1_000, total: 1_030 };

  it("50 spent: refund 950, void 30 bonus, wallet debit 980", () => {
    expect(hierarchyGrantPrincipalSpent(980, grant)).toBe(50);
    expect(hierarchyRecoverablePrincipalRefund(980, grant)).toBe(950);
    expect(hierarchyRecoverWalletSlice(980, grant)).toEqual({
      walletDebit: 980,
      payerRefund: 950,
      bonusVoid: 30,
    });
  });

  it("1010 spent: only 20 bonus left, no payer refund", () => {
    expect(hierarchyGrantPrincipalSpent(20, grant)).toBe(1_000);
    expect(hierarchyRecoverablePrincipalRefund(20, grant)).toBe(0);
    expect(hierarchyRecoverWalletSlice(20, grant)).toEqual({
      walletDebit: 20,
      payerRefund: 0,
      bonusVoid: 20,
    });
  });

  it("no spend: refund full base, void full promo", () => {
    expect(hierarchyRecoverWalletSlice(1_030, grant)).toEqual({
      walletDebit: 1_030,
      payerRefund: 1_000,
      bonusVoid: 30,
    });
  });
});

describe("buildReversibleRecoverOptions", () => {
  it("manager example: 50 spent on oldest load — partial refunds 950", () => {
    const grants = [g(1, 1_030, 1_000), g(2, 1_050, 1_000), g(3, 1_060, 1_000)];
    const kept = buildReversibleRecoverOptions(grants, 3_090);
    expect(kept.map((x) => x.grantTxId)).toEqual([3, 2, 1]);
    expect(kept[0]!.recoverableAmount).toBe(1_000);
    expect(kept[0]!.walletDebitAmount).toBe(1_060);
    expect(kept[1]!.recoverableAmount).toBe(1_000);
    expect(kept[1]!.walletDebitAmount).toBe(1_050);
    expect(kept[2]!.recoverableAmount).toBe(950);
    expect(kept[2]!.walletDebitAmount).toBe(980);
    expect(kept[2]!.bonusVoidAmount).toBe(30);
    expect(kept[2]!.isPartialRemainder).toBe(true);
  });

  it("four loads, 300 balance: remainder refunds principal minus spend", () => {
    const grants = [g(1, 1_030, 1_000), g(2, 100, 50), g(3, 560, 500), g(4, 1_060, 1_000)];
    const kept = buildReversibleRecoverOptions(grants, 300);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.grantTxId).toBe(4);
    expect(kept[0]!.recoverableAmount).toBe(240);
    expect(kept[0]!.walletDebitAmount).toBe(300);
    expect(kept[0]!.bonusVoidAmount).toBe(60);
    expect(kept[0]!.isPartialRemainder).toBe(true);
  });

  it("four loads, 1500 balance: full newest then partial", () => {
    const grants = [g(1, 1_030, 1_000), g(2, 100, 50), g(3, 560, 500), g(4, 1_060, 1_000)];
    const kept = buildReversibleRecoverOptions(grants, 1_500);
    expect(kept.map((x) => x.grantTxId)).toEqual([4, 3]);
    expect(kept[0]!.recoverableAmount).toBe(1_000);
    expect(kept[0]!.walletDebitAmount).toBe(1_060);
    expect(kept[0]!.creditsAvailableAfter).toBe(440);
    expect(kept[1]!.recoverableAmount).toBe(380);
    expect(kept[1]!.walletDebitAmount).toBe(440);
    expect(kept[1]!.isPartialRemainder).toBe(true);
  });

  it("no spend: all full loads newest-first", () => {
    const grants = [g(1, 1_000), g(2, 2_000), g(3, 3_000)];
    const kept = buildReversibleRecoverOptions(grants, 6_000);
    expect(kept.map((x) => x.grantTxId)).toEqual([3, 2, 1]);
    expect(kept.every((x) => x.recoverableAmount === x.base)).toBe(true);
  });
});

describe("applyLegacyUntaggedRecoverFifo", () => {
  it("does not consume grants added after the legacy recover row", () => {
    const consumed = new Set<number>();
    applyLegacyUntaggedRecoverFifo(
      [
        { txno: 42, periods: 15 },
        { txno: 58, periods: 5 },
        { txno: 59, periods: 5 },
        { txno: 60, periods: 5 },
      ],
      [{ txno: 47, periods: 20 }],
      consumed,
    );
    expect(consumed.has(42)).toBe(true);
    expect(consumed.has(58)).toBe(false);
    expect(consumed.has(59)).toBe(false);
    expect(consumed.has(60)).toBe(false);
  });
});
