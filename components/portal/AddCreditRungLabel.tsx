"use client";

import { cn } from "@/lib/cn";
import type { HierarchyAddCreditRung } from "@/lib/repos/billing";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmt(n: number) {
  return nf.format(Math.max(0, Math.round(n)));
}

const promoTagClass =
  "text-[10px] font-normal normal-case tracking-normal text-muted-foreground/65 dark:text-muted-foreground/55";

const promoValueClass = "font-semibold tabular-nums text-emerald-700 dark:text-emerald-400";

const promoOpClass = "font-medium tabular-nums text-foreground/90";

type Props = {
  rung: HierarchyAddCreditRung;
  promoLayout: boolean;
  /** Highlight promo values (dropdown list with bonuses). */
  emphasized?: boolean;
  className?: string;
};

export function AddCreditRungLabel({ rung, promoLayout, emphasized = false, className }: Props) {
  if (!promoLayout) {
    return (
      <span className={cn("tabular-nums", emphasized ? "font-medium text-foreground" : "text-foreground", className)}>
        {fmt(rung.base)} credits
      </span>
    );
  }

  const base = Math.round(rung.base);
  const p1 = Math.round(rung.promo1);
  const p2 = Math.round(rung.promo2);
  const total = Math.round(rung.total);
  const valueClass = emphasized ? promoValueClass : "font-medium tabular-nums text-foreground";

  return (
    <span className={cn("inline tabular-nums leading-snug", className)}>
      <span className={valueClass}>{fmt(base)}</span>
      <span className={promoOpClass}> + </span>
      <span className={valueClass}>{fmt(p1)}</span>
      <span className={promoTagClass}> (P1)</span>
      <span className={promoOpClass}> + </span>
      <span className={valueClass}>{fmt(p2)}</span>
      <span className={promoTagClass}> (P2)</span>
      <span className={promoOpClass}> = </span>
      <span className={valueClass}>{fmt(total)}</span>
      <span className={promoTagClass}> (total)</span>
    </span>
  );
}
