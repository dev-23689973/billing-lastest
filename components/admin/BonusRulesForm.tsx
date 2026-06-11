"use client";

import { useState } from "react";
import { ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import { saveBonusPromoRulesAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromoActivityRankBadge } from "@/components/theme/PromoActivityRankBadge";
import type { PromoTier } from "@/lib/promoBonus";
import { validatePromoTiers } from "@/lib/promoBonus";
import {
  activityBadgeAriaLabel,
  activityRankLevelFromTierIndex,
  PROMO2_MAX_TIERS,
  validatePromo2TierLimit,
} from "@/lib/promoActivityBadge";
import { cn } from "@/lib/cn";
import { rsIconMd } from "@/lib/ui/responsiveScale";

function emptyRow(): PromoTier {
  return { ge: Number.NaN, lt: null, percentage: Number.NaN };
}

function tierInputClassName() {
  return "h-7 w-full min-w-0 border-0 bg-transparent px-1 py-0 text-xs font-mono tabular-nums shadow-none ring-0 focus-visible:ring-0 sm:h-8 sm:px-1.5 sm:text-sm";
}

function TierTable({
  title,
  subtitle,
  rows,
  onChange,
  onAdd,
  onRemove,
  showBadgeColumn = false,
  maxRows,
}: {
  title: string;
  subtitle: string;
  rows: PromoTier[];
  onChange: (index: number, patch: Partial<PromoTier>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  showBadgeColumn?: boolean;
  maxRows?: number;
}) {
  const columnCount = showBadgeColumn ? 6 : 5;
  const atMaxRows = maxRows != null && rows.length >= maxRows;

  return (
    <section className="flex min-w-0 flex-col space-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4 lg:min-h-0 lg:flex-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-3 text-xs font-medium"
          onClick={onAdd}
          disabled={atMaxRows}
          title={atMaxRows ? `Maximum ${maxRows} tiers reached` : undefined}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add tier
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background/30 shadow-inner lg:min-h-0 lg:flex-1">
        <div className="thin-scrollbar min-h-[280px] max-h-[min(55dvh,480px)] overflow-y-auto overflow-x-hidden pb-2 [scrollbar-gutter:stable] sm:min-h-[320px] lg:h-full lg:min-h-0 lg:max-h-[min(52dvh,520px)]">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className={showBadgeColumn ? "w-[8%]" : "w-[10%]"} />
              <col className={showBadgeColumn ? "w-[20%]" : "w-[26%]"} />
              <col className={showBadgeColumn ? "w-[20%]" : "w-[26%]"} />
              <col className={showBadgeColumn ? "w-[16%]" : "w-[24%]"} />
              {showBadgeColumn ? <col className="w-[24%]" /> : null}
              <col className={showBadgeColumn ? "w-[14%]" : "w-[16%]"} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="border-b border-border/70 text-left text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                <th className="py-2 pl-1.5 pr-0.5 font-medium sm:pl-3 sm:pr-2">
                  <span className="sm:hidden">#</span>
                  <span className="hidden sm:inline">No</span>
                </th>
                <th className="py-2 pr-0.5 font-medium sm:pr-2">
                  <span className="sm:hidden">GE</span>
                  <span className="hidden sm:inline">From (GE)</span>
                </th>
                <th className="py-2 pr-0.5 font-medium sm:pr-2">
                  <span className="sm:hidden">LT</span>
                  <span className="hidden sm:inline">To (LT)</span>
                </th>
                <th className="py-2 pr-0.5 font-medium sm:pr-2">
                  <span className="sm:hidden">%</span>
                  <span className="hidden sm:inline">Rate %</span>
                </th>
                {showBadgeColumn ? (
                  <th className="py-2 pr-0.5 font-medium sm:pr-2">
                    <span className="sm:hidden">Badge</span>
                    <span className="hidden sm:inline">Badge</span>
                  </th>
                ) : null}
                <th className="py-2 pr-1 text-center font-medium sm:pr-2" aria-label="Remove row">
                  <Trash2 className={cn(rsIconMd, "mx-auto text-muted-foreground/80")} strokeWidth={2} aria-hidden />
                </th>
              </tr>
            </thead>
            <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-8 text-center text-xs text-muted-foreground">
                  No tiers yet. Click <span className="font-medium text-foreground">&quot;Add tier&quot;</span> to create your first range.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const tierIndex = i + 1;
                const badgeLevel = showBadgeColumn ? activityRankLevelFromTierIndex(tierIndex, rows.length) : null;

                return (
                <tr key={i} className="border-b border-border/35 last:border-0 even:bg-background/15 hover:bg-background/25">
                  <td className="py-0.5 pl-1.5 pr-0.5 align-middle sm:py-1 sm:pl-3 sm:pr-2">
                    <span className="inline-flex min-w-6 justify-center rounded-md border border-border/60 bg-muted/25 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/85 sm:min-w-8 sm:px-2 sm:text-[11px]">
                      {i + 1}
                    </span>
                  </td>
                  <td className="min-w-0 py-0.5 pr-0.5 align-middle sm:py-1 sm:pr-1">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={Number.isFinite(row.ge) ? row.ge : ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          onChange(i, { ge: Number.NaN });
                          return;
                        }
                        const parsed = Number.parseInt(raw, 10);
                        onChange(i, { ge: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : Number.NaN });
                      }}
                      className={tierInputClassName()}
                      aria-label={`${title} row ${i + 1} from (GE)`}
                    />
                  </td>
                  <td className="min-w-0 py-0.5 pr-0.5 align-middle sm:py-1 sm:pr-1">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="∞"
                      value={row.lt == null ? "" : row.lt}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (v === "") onChange(i, { lt: null });
                        else onChange(i, { lt: Math.floor(Number.parseInt(v, 10) || 0) });
                      }}
                      className={tierInputClassName()}
                      aria-label={`${title} row ${i + 1} to (LT), empty for open end`}
                    />
                  </td>
                  <td className="min-w-0 py-0.5 pr-0.5 align-middle sm:py-1 sm:pr-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="0"
                      value={Number.isFinite(row.percentage) ? row.percentage : ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          onChange(i, { percentage: Number.NaN });
                          return;
                        }
                        const parsed = Number.parseFloat(raw);
                        onChange(i, { percentage: Number.isFinite(parsed) ? parsed : Number.NaN });
                      }}
                      className={tierInputClassName()}
                      aria-label={`${title} row ${i + 1} rate percent`}
                    />
                  </td>
                  {showBadgeColumn ? (
                    <td className="py-0.5 pr-0.5 align-middle sm:py-1 sm:pr-1">
                      {badgeLevel ? (
                        <PromoActivityRankBadge
                          rank={badgeLevel.rank}
                          litCount={badgeLevel.count}
                          className="gap-0 [&_.promo-activity-rank__img]:h-3.5 [&_.promo-activity-rank__img]:w-3.5 sm:[&_.promo-activity-rank__img]:h-4 sm:[&_.promo-activity-rank__img]:w-4"
                          title={`${badgeLevel.rank} ${badgeLevel.count}/5`}
                          ariaLabel={activityBadgeAriaLabel(badgeLevel)}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="py-0.5 pr-0.5 align-middle sm:py-1 sm:pr-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mx-auto flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-md p-0 text-destructive/75 hover:bg-destructive/10 hover:text-destructive sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10"
                      onClick={() => onRemove(i)}
                      aria-label={`Remove row ${i + 1}`}
                    >
                      <Trash2 className={cn(rsIconMd, "sm:h-5 sm:w-5")} strokeWidth={2.25} aria-hidden />
                    </Button>
                  </td>
                </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function BonusRulesForm({ initialP1, initialP2 }: { initialP1: PromoTier[]; initialP2: PromoTier[] }) {
  const [p1, setP1] = useState<PromoTier[]>(initialP1.length ? initialP1 : []);
  const [p2, setP2] = useState<PromoTier[]>(initialP2.length ? initialP2 : []);
  const [clientError, setClientError] = useState<string | null>(null);
  const p1Json = JSON.stringify(p1);
  const p2Json = JSON.stringify(p2);

  return (
    <form
      action={saveBonusPromoRulesAction}
      onSubmit={(e) => {
        setClientError(null);
        const err1 = validatePromoTiers(p1, "Promo 1 (requested credits)", true);
        if (err1) {
          e.preventDefault();
          setClientError(err1);
          return;
        }
        const err2 = validatePromoTiers(p2, "Promo 2 (active clients)", true);
        if (err2) {
          e.preventDefault();
          setClientError(err2);
          return;
        }
        const err2Limit = validatePromo2TierLimit(p2);
        if (err2Limit) {
          e.preventDefault();
          setClientError(err2Limit);
        }
      }}
      className="flex flex-col gap-4 lg:min-h-0 lg:flex-1"
    >
      {clientError ? (
        <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{clientError}</p>
      ) : null}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 lg:min-h-0 lg:flex-1">
        <TierTable
          title="Promo 1 — Requested credits"
          subtitle="Rule: GE ≤ requested credits < LT. Leave LT empty for the final open-ended row."
          rows={p1}
          onAdd={() => setP1((r) => [...r, emptyRow()])}
          onRemove={(i) => setP1((r) => r.filter((_, j) => j !== i))}
          onChange={(i, patch) => setP1((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))}
        />
        <TierTable
          title="Promo 2 — Active clients"
          subtitle={`Counts active clients (\`accounts.status\` on). Uses the same rate % on requested credits. Up to ${PROMO2_MAX_TIERS} tiers (Bronze → VIP badges).`}
          rows={p2}
          showBadgeColumn
          maxRows={PROMO2_MAX_TIERS}
          onAdd={() => setP2((r) => (r.length >= PROMO2_MAX_TIERS ? r : [...r, emptyRow()]))}
          onRemove={(i) => setP2((r) => r.filter((_, j) => j !== i))}
          onChange={(i, patch) => setP2((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))}
        />
      </div>
      <input type="hidden" name="promo_p1_json" value={p1Json} readOnly className="sr-only" aria-hidden tabIndex={-1} />
      <input type="hidden" name="promo_p2_json" value={p2Json} readOnly className="sr-only" aria-hidden tabIndex={-1} />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Rules must be contiguous with no overlap. Only the <span className="font-medium text-foreground">last row in each table</span> may leave LT empty (∞).
        </p>
        <Button
          type="submit"
          className="h-10 min-w-[160px] rounded-lg gap-1.5 bg-cyan-500 px-4 text-slate-950 hover:bg-cyan-400"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          Save rules
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
