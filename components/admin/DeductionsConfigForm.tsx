"use client";

import { useState } from "react";
import { CalendarRange, Coins, Gift, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { saveDeductionsAction } from "@/actions/forms";
import { DeductionMonthSelect } from "@/components/admin/DeductionMonthSelect";
import { StaffHudDashedSubmitButton } from "@/components/admin/StaffHudDashedSubmitButton";
import { HudFormInput } from "@/components/admin/settings-ui";
import { Button } from "@/components/ui/button";
import {
  creditsChargedFromMonthDeduction,
  validateDeductionRules,
  type DeductionRuleInput,
} from "@/lib/creditDeductions";
import {
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

const deductionsTierTableShell =
  "w-full overflow-hidden rounded-lg border border-border/60 bg-card/80 ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

const deductionTierSelectClass = cn(
  "flex h-8 min-h-8 w-full min-w-0 items-center justify-between gap-1 rounded-lg px-2 text-xs font-medium leading-none shadow-none",
  managersToolbarGreyBorder,
  "bg-background/40 backdrop-blur-sm dark:bg-white/[0.05]",
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "transition-[border-color,box-shadow] duration-300 ease-out",
  "hover:bg-muted/30",
  "[&_svg]:h-3 [&_svg]:w-3 [&_svg]:opacity-70",
);

const tierHeadCell =
  "px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const tierRowGrid =
  "grid w-full grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-x-2 border-b border-border/60 px-2 py-1.5 last:border-b-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3.5rem_2.75rem]";
const tierCell = "min-w-0";

const policyCardClass = cn(
  "flex cursor-pointer items-start gap-2 rounded-md border border-border/60 bg-card/80 p-2.5 transition-colors",
  "hover:bg-muted/25 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring",
);

const policySectionClass = "shrink-0 space-y-2 border-t border-border/60 px-3 py-3 sm:px-4";

const policyFooterClass =
  "flex shrink-0 flex-col gap-3 border-t border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4";

const policyCheckboxClass =
  "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-cyan-600/25 text-cyan-600 accent-cyan-500 dark:border-cyan-400/30 dark:text-cyan-400";

const outlineBtnClass = cn(
  "h-8 gap-1 rounded-md bg-transparent px-2.5 text-[11px] font-semibold text-foreground shadow-none",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "hover:bg-muted/25",
);

function emptyRule(): DeductionRuleInput {
  return { month: 6, creditsCharged: 2 };
}

export function DeductionsConfigForm({
  initialRows,
  monthFree,
  recoverBonus,
  className,
}: {
  initialRows: { month: number; month_deduction: string | number }[];
  monthFree: boolean;
  recoverBonus: boolean;
  className?: string;
}) {
  const [rules, setRules] = useState<DeductionRuleInput[]>(() =>
    initialRows.length
      ? initialRows.map((r) => ({
          month: Number(r.month),
          creditsCharged: creditsChargedFromMonthDeduction(Number(r.month), Number(r.month_deduction) || 0),
        }))
      : [],
  );
  const [oneMonthFree, setOneMonthFree] = useState(monthFree);
  const [recoverBonusOn, setRecoverBonusOn] = useState(recoverBonus);
  const [clientError, setClientError] = useState<string | null>(null);

  const rulesJson = JSON.stringify(rules);

  return (
    <form
      action={saveDeductionsAction}
      onSubmit={(e) => {
        setClientError(null);
        const v = validateDeductionRules(rules);
        if (!v.ok) {
          e.preventDefault();
          setClientError(v.error);
        }
      }}
      className={cn("flex flex-col", className)}
    >
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
        <Button type="button" variant="outline" size="sm" className={outlineBtnClass} onClick={() => setRules((r) => [...r, emptyRule()])}>
          <Plus className="h-3 w-3" aria-hidden />
          Add tier
        </Button>
      </div>

      {clientError ? (
        <p className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive sm:px-4">
          {clientError}
        </p>
      ) : null}

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        {rules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-6 text-center text-xs text-muted-foreground">
            No tiers yet. Use <span className="font-medium text-foreground">Add tier</span> above.
          </p>
        ) : (
          <div className={deductionsTierTableShell} role="table" aria-label="Renewal credit tiers">
            <div className={cn(tierRowGrid, "border-border/60 bg-muted/15")} role="row">
              <span className={cn(tierHeadCell, tierCell)} role="columnheader">
                #
              </span>
              <span className={cn(tierHeadCell, tierCell)} role="columnheader">
                <span className="inline-flex items-center justify-center gap-0.5">
                  <CalendarRange className="h-3 w-3 shrink-0 text-cyan-500/90" aria-hidden />
                  Mo
                </span>
              </span>
              <span className={cn(tierHeadCell, tierCell)} role="columnheader">
                <span className="inline-flex items-center justify-center gap-0.5">
                  <Coins className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
                  Cr
                </span>
              </span>
              <span className={cn(tierHeadCell, tierCell, "hidden sm:block")} role="columnheader">
                +mo
              </span>
              <span className={cn(tierHeadCell, "text-center")} role="columnheader" aria-label="Actions" />
            </div>
            {rules.map((row, index) => {
              const monthSelectId = `deduction-month-${index}`;
              const creditsInputId = `deduction-credits-${index}`;
              const bonus = row.month - row.creditsCharged;
              return (
                <div key={index} className={cn(tierRowGrid, "hover:bg-muted/20")} role="row">
                  <span className={cn(tierCell, "flex justify-center")} role="cell">
                    <span className="inline-flex min-w-[1.25rem] justify-center rounded-md border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[10px] font-semibold tabular-nums">
                      {index + 1}
                    </span>
                  </span>
                  <span className={tierCell} role="cell">
                    <DeductionMonthSelect
                      id={monthSelectId}
                      defaultMonth={row.month}
                      compact
                      className={deductionTierSelectClass}
                      value={row.month}
                      onChange={(month) =>
                        setRules((r) =>
                          r.map((item, j) =>
                            j === index ? { month, creditsCharged: Math.min(item.creditsCharged, month) } : item,
                          ),
                        )
                      }
                    />
                  </span>
                  <span className={tierCell} role="cell">
                    <HudFormInput
                      icon={Coins}
                      id={creditsInputId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={row.month}
                      step={1}
                      value={row.creditsCharged}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        setRules((r) =>
                          r.map((item, j) =>
                            j === index
                              ? {
                                  ...item,
                                  creditsCharged: Number.isFinite(n) ? Math.max(0, Math.min(row.month, n)) : 0,
                                }
                              : item,
                          ),
                        );
                      }}
                      shellClassName="h-8 min-h-8 w-full min-w-0 gap-1.5 px-2"
                      className="font-mono text-xs tabular-nums"
                    />
                  </span>
                  <span className={cn(tierCell, "hidden justify-center sm:flex")} role="cell">
                    <span
                      className={cn(
                        "inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                        bonus > 0 ? "bg-emerald-500/6 text-emerald-600 dark:text-emerald-300/90" : "text-muted-foreground",
                      )}
                    >
                      {bonus > 0 ? `+${bonus}` : "—"}
                    </span>
                  </span>
                  <span className="flex justify-center" role="cell">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-muted-foreground/80 hover:bg-destructive/15 hover:text-destructive"
                      onClick={() => setRules((r) => r.filter((_, j) => j !== index))}
                      aria-label={`Remove tier ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <input type="hidden" name="deduction_rules_json" value={rulesJson} readOnly className="sr-only" aria-hidden tabIndex={-1} />
      <input type="hidden" name="one_month_free" value={oneMonthFree ? "1" : "0"} readOnly className="sr-only" aria-hidden tabIndex={-1} />
      <input
        type="hidden"
        name="is_recover_bonus_credit"
        value={recoverBonusOn ? "1" : "0"}
        readOnly
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      <div className={policySectionClass}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Policy</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label htmlFor="one_month_free_ui" className={policyCardClass}>
            <input
              id="one_month_free_ui"
              type="checkbox"
              checked={oneMonthFree}
              onChange={(e) => setOneMonthFree(e.target.checked)}
              className={policyCheckboxClass}
            />
            <span className="min-w-0 leading-tight">
              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                <Gift className="h-3 w-3 text-cyan-500/90" aria-hidden />
                One month free
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">1-mo bonus on create-user flows</span>
            </span>
          </label>
          <label htmlFor="is_recover_bonus_credit_ui" className={policyCardClass}>
            <input
              id="is_recover_bonus_credit_ui"
              type="checkbox"
              checked={recoverBonusOn}
              onChange={(e) => setRecoverBonusOn(e.target.checked)}
              className={policyCheckboxClass}
            />
            <span className="min-w-0 leading-tight">
              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                <RotateCcw className="h-3 w-3 text-violet-400/90" aria-hidden />
                Recover bonus credit
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">Credit recovery and recoverable pool when on</span>
            </span>
          </label>
        </div>
      </div>

      <footer className={policyFooterClass}>
        <p className="min-w-0 text-[10px] leading-snug text-muted-foreground">
          Saves deduction rules and credit recovery settings
        </p>
        <StaffHudDashedSubmitButton role="reseller" className="w-full min-w-0 sm:w-auto sm:min-w-[10.5rem]">
          <Save className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Save changes</span>
        </StaffHudDashedSubmitButton>
      </footer>
    </form>
  );
}
