import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { getDeductionsConfig } from "@/lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import { DeductionsConfigForm } from "@/components/admin/DeductionsConfigForm";
import { adminDataPanelShellClass } from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

type Props = { searchParams?: Promise<{ ok?: string; error?: string }> };

export default async function DeductionsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const cfg = await getDeductionsConfig();

  const deductionFlashes: FlashToastItem[] = [];
  if (sp.ok) {
    deductionFlashes.push({
      type: "success",
      message: "Changes saved",
      description: "Renewal credit rules and policy flags are now active.",
    });
  }
  if (sp.error) {
    deductionFlashes.push({
      type: "error",
      message: "Could not save",
      description: decodeURIComponent(sp.error),
    });
  }

  return (
    <div className="space-y-5 pb-2 sm:pb-10">
      
      <PageHeader title="Credit deductions" breadcrumb="Home › Credit Deductions" />

      <section className={cn("flex flex-col", adminDataPanelShellClass)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Renewal credit rules</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Promo applies only on listed month values (e.g. 4, 6, 12). Other months renew at 1 credit per month.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground">
            {cfg.rows.length} tier{cfg.rows.length === 1 ? "" : "s"}
          </span>
        </header>

        <DeductionsConfigForm
          initialRows={cfg.rows}
          monthFree={cfg.monthFree}
          recoverBonus={cfg.recoverBonus}
        />
      </section>
    </div>
  );
}
