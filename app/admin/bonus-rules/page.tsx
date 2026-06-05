import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";
import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { BonusRulesForm } from "@/components/admin/BonusRulesForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getPromoBonusRules } from "@/lib/data";

type Props = { searchParams?: Promise<{ ok?: string; error?: string }> };

export default async function BonusRulesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rules = await getPromoBonusRules();

  const flashes: FlashToastItem[] = [];
  if (sp.ok) {
    flashes.push({
      type: "success",
      message: "Bonus rules saved",
      description: "Promo tiers are stored in billing configs and apply on the next add-credit action.",
    });
  }
  if (sp.error) {
    flashes.push({
      type: "error",
      message: "Could not save",
      description: decodeURIComponent(sp.error),
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-none flex-1 flex-col gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-5 lg:overflow-hidden lg:p-6">
      <FlashToastsBoundary items={flashes} stripParams={["ok", "error"]} />
      <PageHeader title="Bonus rules" breadcrumb="Home › Settings › Bonus rules" />
      <div className="shrink-0">
        <Link
          href="/admin/settings?tab=billing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to settings
        </Link>
      </div>

      <div className="flex flex-col rounded-2xl border border-border/60 bg-transparent p-4 shadow-sm sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="mb-4 flex shrink-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <Gift className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold text-foreground">Promo 1 + Promo 2</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Promo 1</span> = tier by requested credits;{" "}
              <span className="font-medium text-foreground">Promo 2</span> = tier by active clients. Both % apply to the same base (rounded up).{" "}
              <span className="font-medium text-foreground">Recover</span>: enter principal — matching grants reverse the full total (incl. promo), FIFO.
            </p>
          </div>
        </div>
        <BonusRulesForm initialP1={rules.p1} initialP2={rules.p2} />
      </div>
    </div>
  );
}
