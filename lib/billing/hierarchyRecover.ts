import {
  isWalletBalanceRecoverGrantId,
  WALLET_BALANCE_RECOVER_GRANT_TX_ID,
} from "@/lib/constants/hierarchyCredits";

/** Client-safe hierarchy grant row for recover UI (no server / DB imports). */
export type HierarchyReversibleGrant = {
  grantTxId: number;
  creditedAt: string;
  base: number;
  promo1: number;
  promo2: number;
  total: number;
  /** Legacy rows without `[grant_meta:…]` — combined promo only. */
  promoUnsplit?: number;
  /** Principal refunded to payer when this row is recovered. */
  recoverableAmount?: number;
  /** Credits removed from target wallet (principal + promo void). */
  walletDebitAmount?: number;
  /** Promo stripped on recover (not credited to payer). */
  bonusVoidAmount?: number;
  /** Credits left in wallet after recovering this row (orphan slices below a full top load). */
  creditsAvailableAfter?: number;
  /** True when only a remainder of this grant is still in the wallet. */
  isPartialRemainder?: boolean;
  /** Recover current wallet balance without a tagged grant transaction. */
  walletBalanceOnly?: boolean;
};

/** Principal already consumed from a grant (subscriptions spend principal before promo). */
export function hierarchyGrantPrincipalSpent(
  walletRemainder: number,
  grant: Pick<HierarchyReversibleGrant, "base" | "total">,
): number {
  const rem = Math.max(0, Math.floor(walletRemainder));
  const total = Math.max(0, Math.floor(grant.total));
  const base = Math.max(0, Math.floor(grant.base));
  const spent = Math.max(0, total - rem);
  return Math.min(spent, base);
}

/** Principal refunded to payer when reversing a wallet slice (base − principal spent). */
export function hierarchyRecoverablePrincipalRefund(
  walletRemainder: number,
  grant: Pick<HierarchyReversibleGrant, "base" | "total">,
): number {
  const base = Math.max(0, Math.floor(grant.base));
  return Math.max(0, base - hierarchyGrantPrincipalSpent(walletRemainder, grant));
}

/** Split a recoverable wallet slice: strip promo first, refund remaining principal to payer. */
export function hierarchyRecoverWalletSlice(
  walletRemainder: number,
  grant: Pick<HierarchyReversibleGrant, "base" | "total" | "walletBalanceOnly">,
): { walletDebit: number; payerRefund: number; bonusVoid: number } {
  const walletDebit = Math.max(0, Math.floor(walletRemainder));
  if (grant.walletBalanceOnly) {
    return { walletDebit, payerRefund: walletDebit, bonusVoid: 0 };
  }
  const payerRefund = hierarchyRecoverablePrincipalRefund(walletDebit, grant);
  const bonusVoid = Math.max(0, walletDebit - payerRefund);
  return { walletDebit, payerRefund, bonusVoid };
}

export function grantWalletDebitAmount(
  g: Pick<HierarchyReversibleGrant, "walletDebitAmount" | "total" | "recoverableAmount">,
): number {
  return Math.max(0, Math.floor(g.walletDebitAmount ?? g.total ?? g.recoverableAmount ?? 0));
}

/** Attach recover slice amounts to a grant row (used by server list + tests). */
export function enrichGrantRecoverSlice(
  grant: HierarchyReversibleGrant,
  walletRemainder: number,
  isPartialRemainder: boolean,
  creditsAvailableAfter?: number,
): HierarchyReversibleGrant {
  const slice = hierarchyRecoverWalletSlice(walletRemainder, grant);
  return {
    ...grant,
    recoverableAmount: slice.payerRefund,
    walletDebitAmount: slice.walletDebit,
    bonusVoidAmount: slice.bonusVoid,
    isPartialRemainder,
    ...(creditsAvailableAfter != null ? { creditsAvailableAfter } : {}),
  };
}

/**
 * Grocery-wallet recover options (oldest-first `grants`).
 *
 * Spending consumes oldest loads first. Lists **all full loads** (newest-first). When the newest
 * slice in the wallet is only a **partial remainder**, that row is included too (debit = remainder).
 */
export function buildReversibleRecoverOptions(
  grants: HierarchyReversibleGrant[],
  balance: number,
): HierarchyReversibleGrant[] {
  if (grants.length < 1) return [];
  const bal = Math.max(0, Math.floor(balance));
  if (bal < 1) return [];

  const total = grants.reduce((s, g) => s + g.total, 0);
  let remainingSpent = Math.max(0, total - bal);

  const slices: { grant: HierarchyReversibleGrant; remaining: number }[] = [];
  for (const g of grants) {
    if (remainingSpent >= g.total) {
      remainingSpent -= g.total;
      slices.push({ grant: g, remaining: 0 });
    } else if (remainingSpent > 0) {
      slices.push({ grant: g, remaining: g.total - remainingSpent });
      remainingSpent = 0;
    } else {
      slices.push({ grant: g, remaining: g.total });
    }
  }

  const orphanBelow = (index: number) => {
    let orphan = 0;
    for (let j = 0; j < index; j++) {
      const below = slices[j]!;
      if (below.remaining > 0 && below.remaining < below.grant.total) {
        orphan += below.remaining;
      }
    }
    return orphan;
  };

  const fullLoads: HierarchyReversibleGrant[] = [];
  const partialLoads: HierarchyReversibleGrant[] = [];

  for (let i = slices.length - 1; i >= 0; i--) {
    const { grant, remaining } = slices[i]!;
    if (remaining < 1) continue;
    if (remaining >= grant.total) {
      fullLoads.push(enrichGrantRecoverSlice(grant, grant.total, false, orphanBelow(i)));
    } else {
      partialLoads.push(enrichGrantRecoverSlice(grant, remaining, true, 0));
    }
  }

  return [...fullLoads, ...partialLoads];
}

/** Dropdown row when balance > 0 but no grant CRDT can be matched. */
export function buildWalletBalanceRecoverOption(balance: number): HierarchyReversibleGrant {
  const bal = Math.max(0, Math.floor(balance));
  return {
    grantTxId: WALLET_BALANCE_RECOVER_GRANT_TX_ID,
    creditedAt: "",
    base: bal,
    promo1: 0,
    promo2: 0,
    total: bal,
    recoverableAmount: bal,
    walletDebitAmount: bal,
    bonusVoidAmount: 0,
    isPartialRemainder: false,
    creditsAvailableAfter: 0,
    walletBalanceOnly: true,
  };
}

/** When wallet balance exceeds unconsumed grant totals, expose the orphan remainder for recover. */
export function appendWalletSurplusRecoverOption(
  options: HierarchyReversibleGrant[],
  grants: HierarchyReversibleGrant[],
  balance: number,
): HierarchyReversibleGrant[] {
  if (options.some((g) => g.walletBalanceOnly)) return options;
  const bal = Math.max(0, Math.floor(balance));
  if (bal < 1) return options;
  const grantTotal = grants.reduce((s, g) => s + g.total, 0);
  const surplus = bal - grantTotal;
  if (surplus < 1) return options;
  return [...options, buildWalletBalanceRecoverOption(surplus)];
}

export type RecoverDebitLine = {
  tid: number;
  /** Credits removed from target wallet. */
  walletDebit: number;
  /** Credits credited to payer (principal refund). */
  payerRefund: number;
  /** Promo voided on recover (not refunded). */
  bonusVoid: number;
  base: number;
};

/** Resolve wallet DBIT + payer CRDT per grant for recover. */
export function resolveRecoverDebitAmounts(
  options: HierarchyReversibleGrant[],
  grantTxIds: number[],
): RecoverDebitLine[] | null {
  const map = new Map(options.map((g) => [g.grantTxId, g]));
  const out: RecoverDebitLine[] = [];
  for (const tid of grantTxIds) {
    const g = map.get(tid);
    if (!g) return null;
    const walletDebit = grantWalletDebitAmount(g);
    const payerRefund = Math.max(0, Math.floor(g.recoverableAmount ?? (g.walletBalanceOnly ? walletDebit : 0)));
    const bonusVoid = Math.max(0, Math.floor(g.bonusVoidAmount ?? walletDebit - payerRefund));
    if (!Number.isFinite(walletDebit) || walletDebit < 1) return null;
    out.push({
      tid,
      walletDebit,
      payerRefund,
      bonusVoid,
      base: isWalletBalanceRecoverGrantId(tid) ? walletDebit : g.base,
    });
  }
  return out;
}
