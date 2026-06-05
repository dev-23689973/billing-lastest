"use client";

import { cn } from "@/lib/cn";
import { grantWalletDebitAmount, type HierarchyReversibleGrant } from "@/lib/billing/hierarchyRecover";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmt(n: number) {
  return nf.format(Math.max(0, Math.round(n)));
}

function formatGrantDate(creditedAt: string | undefined): string {
  if (!creditedAt) return "";
  return creditedAt.replace("T", " ").slice(0, 19);
}

/** Plain text for search, tooltips, and screen readers. */
export function recoverGrantPlainText(g: HierarchyReversibleGrant): string {
  const walletDebit = grantWalletDebitAmount(g);
  const payerRefund = Math.max(0, Math.floor(g.recoverableAmount ?? walletDebit));
  const bonusVoid = Math.max(0, Math.floor(g.bonusVoidAmount ?? walletDebit - payerRefund));
  if (g.walletBalanceOnly) {
    return `Recover wallet balance · ${fmt(walletDebit)} credits`;
  }
  if (g.isPartialRemainder) {
    if (bonusVoid > 0 && payerRefund > 0) {
      return `${fmt(payerRefund)} refunded + ${fmt(bonusVoid)} promo void = ${fmt(walletDebit)} credits will be lost`;
    }
    if (bonusVoid > 0) {
      return `${fmt(bonusVoid)} promo void = ${fmt(walletDebit)} credits will be lost`;
    }
    return `${fmt(payerRefund)} credits will be lost`;
  }
  const date = formatGrantDate(g.creditedAt);
  if (g.promoUnsplit != null) {
    return `${fmt(g.base)} + promo ${fmt(g.promoUnsplit)} = ${fmt(g.total)} credits will be lost ${date}`.trim();
  }
  return `${fmt(g.base)} + ${fmt(g.promo1)}(P1) + ${fmt(g.promo2)}(P2) = ${fmt(g.total)} credits will be lost ${date}`.trim();
}

const promoTagClass =
  "text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70 dark:text-muted-foreground/55";

const dateClass =
  "ml-1 text-[10px] font-normal tabular-nums text-muted-foreground/80 dark:text-muted-foreground/60";

const amountClass = "font-semibold tabular-nums text-amber-900 dark:text-amber-100";

const opClass = "font-medium tabular-nums text-amber-900/85 dark:text-amber-100/90";

const lostClass = "font-medium text-amber-800/90 dark:text-amber-200/85";

type Props = {
  grant: HierarchyReversibleGrant;
  size?: "default" | "comfortable";
  className?: string;
};

export function RecoverGrantRowLabel({ grant, size = "default", className }: Props) {
  const comfortable = size === "comfortable";
  const walletDebit = grantWalletDebitAmount(grant);
  const payerRefund = Math.max(0, Math.floor(grant.recoverableAmount ?? walletDebit));
  const bonusVoid = Math.max(0, Math.floor(grant.bonusVoidAmount ?? walletDebit - payerRefund));

  if (grant.walletBalanceOnly) {
    return (
      <span
        className={cn(
          "font-semibold tabular-nums text-amber-800 dark:text-amber-300",
          comfortable ? "text-sm" : "text-xs",
          className,
        )}
      >
        Recover wallet balance · <span className={amountClass}>{fmt(walletDebit)}</span> credits
      </span>
    );
  }

  if (grant.isPartialRemainder) {
    const textSize = comfortable ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs";
    return (
      <span className={cn("inline leading-snug", textSize, className)}>
        {payerRefund > 0 ? (
          <>
            <span className={amountClass}>{fmt(payerRefund)}</span>
            <span className={opClass}> refunded</span>
          </>
        ) : null}
        {bonusVoid > 0 ? (
          <>
            {payerRefund > 0 ? <span className={opClass}> + </span> : null}
            <span className={amountClass}>{fmt(bonusVoid)}</span>
            <span className={promoTagClass}> promo void</span>
          </>
        ) : null}
        <span className={lostClass}> = {fmt(walletDebit)} credits will be lost</span>
      </span>
    );
  }

  const date = formatGrantDate(grant.creditedAt);
  const textSize = comfortable ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs";

  if (grant.promoUnsplit != null) {
    return (
      <span className={cn("inline leading-snug", textSize, className)}>
        <span className={amountClass}>{fmt(grant.base)}</span>
        <span className={opClass}> + promo </span>
        <span className={amountClass}>{fmt(grant.promoUnsplit)}</span>
        <span className={opClass}> = </span>
        <span className={amountClass}>{fmt(grant.total)}</span>
        <span className={lostClass}> credits will be lost</span>
        {date ? <span className={dateClass}>{date}</span> : null}
      </span>
    );
  }

  const base = Math.round(grant.base);
  const p1 = Math.round(grant.promo1);
  const p2 = Math.round(grant.promo2);
  const total = Math.round(grant.total);

  return (
    <span className={cn("inline leading-snug", textSize, className)}>
      <span className={amountClass}>{fmt(base)}</span>
      <span className={opClass}> + </span>
      <span className={amountClass}>{fmt(p1)}</span>
      <span className={promoTagClass}> (P1)</span>
      <span className={opClass}> + </span>
      <span className={amountClass}>{fmt(p2)}</span>
      <span className={promoTagClass}> (P2)</span>
      <span className={opClass}> = </span>
      <span className={amountClass}>{fmt(total)}</span>
      <span className={lostClass}> credits will be lost</span>
      {date ? <span className={dateClass}>{date}</span> : null}
    </span>
  );
}
