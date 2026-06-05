import type { HierarchyAddCreditLadders, HierarchyAddCreditRung } from "@/lib/repos/billing";

export type AddCreditPickKind = "promo" | "additional";

/** Whether Promo 1 + 2 apply: promo list yes; additional list no (principal only). */
export function resolveHierarchyAddCreditApplyPromo(
  amount: number,
  ladders: HierarchyAddCreditLadders,
  lastPick?: AddCreditPickKind | null,
): boolean {
  const base = Math.floor(amount);
  if (!Number.isFinite(base) || base < 1) return true;
  if (lastPick === "additional") return false;
  if (lastPick === "promo") return true;
  const inPromo = ladders.promoRungs.some((r) => r.base === base);
  const inAdditional = ladders.additionalRungs.some((r) => r.base === base);
  if (inAdditional && !inPromo) return false;
  if (inPromo) return true;
  return true;
}

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmtBonus(n: number): string {
  return nf.format(Math.max(0, Math.round(n)));
}

function allRungs(ladders: HierarchyAddCreditLadders): HierarchyAddCreditRung[] {
  return [...ladders.promoRungs, ...ladders.additionalRungs];
}

/** Plain text for search / aria (matches visible promo layout). */
export function formatAddCreditRungSearchText(r: HierarchyAddCreditRung, promoLayout: boolean): string {
  return formatAddCreditRungMenuLabel(r, { promoLayout });
}

/** Promo preset: `100 + 5(P1) + 11(P2) = 116 (total)`. Additional preset: `100 credits`. */
export function formatAddCreditRungMenuLabel(r: HierarchyAddCreditRung, opts?: { promoLayout?: boolean }): string {
  const total = Math.round(r.total);
  const base = Math.round(r.base);
  const p1 = Math.round(r.promo1);
  const p2 = Math.round(r.promo2);
  if (opts?.promoLayout) {
    return `${nf.format(base)} + ${fmtBonus(p1)}(P1) + ${fmtBonus(p2)}(P2) = ${nf.format(total)} (total)`;
  }
  return `${nf.format(base)} credits`;
}

/** Closed-state summary for the principal combo (matches a preset row or custom). */
export function formatAddCreditPrincipalSummary(amount: number, ladders: HierarchyAddCreditLadders): string {
  const rung =
    ladders.promoRungs.find((r) => r.base === amount) ?? ladders.additionalRungs.find((r) => r.base === amount);
  if (rung) {
    const inPromo = ladders.promoRungs.some((r) => r.base === amount);
    return formatAddCreditRungMenuLabel(rung, { promoLayout: inPromo });
  }
  return `${nf.format(Math.round(amount))} credits`;
}

export function hierarchyAddCreditLadderBases(ladders: HierarchyAddCreditLadders): Set<number> {
  return new Set(allRungs(ladders).map((r) => r.base));
}
