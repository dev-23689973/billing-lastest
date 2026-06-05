import Link from "next/link";
import { redirect } from "next/navigation";
import { getDeductionsConfig, listStalkerTariffPlans } from "@/lib/data";
import { getSession } from "@/lib/session";
import { getStalkerCustomPackagePlanId, listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { OperatorNewEndUserForm } from "@/components/portal/OperatorNewEndUserForm";
import { createResellerEndUserAction } from "@/actions/forms";
import { buttonOutlineLinkClassName } from "@/components/ui/button";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { newEndUserCreationFlashItems } from "@/lib/urlFlashToasts";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";
import { requirePortalStaffCanCreateSubscriber } from "@/lib/portal/requirePortalStaffCanCreateSubscriber";

type Props = {
  searchParams?: Promise<{ error?: string; bal?: string; req?: string }>;
};

export default async function ResellerNewUserPage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?error=forbidden");
  await requirePortalStaffCanCreateSubscriber(s, "/reseller/users");

  const sp = (await searchParams) ?? {};
  const newUserFlashes = newEndUserCreationFlashItems(sp, "reseller");

  const [cfg, tariffs, customPlanId] = await Promise.all([
    getDeductionsConfig(),
    listStalkerTariffPlans(),
    getStalkerCustomPackagePlanId(),
  ]);
  const addonPackages =
    customPlanId != null && Number.isFinite(customPlanId) && customPlanId > 0
      ? await listStalkerPackagesForPlan(customPlanId)
      : [];
  const validityOptions = buildValidityOptionsFromDeductionRows(cfg.rows, { monthFree: cfg.monthFree });
  const panelClass =
    "overflow-hidden rounded-2xl border-border/60 bg-transparent shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader
        title="Add user"
        breadcrumb={
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5" aria-label="Breadcrumb">
            <Link href="/reseller" className="text-primary hover:underline">
              Dashboard
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link href="/reseller/users" className="text-primary hover:underline">
              Users
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <span className="font-medium text-foreground">New</span>
          </nav>
        }
        showBack={false}
        actions={
          <Link href="/reseller/users" className={buttonOutlineLinkClassName("bg-card shadow-sm")}>
            Back to list
          </Link>
        }
      />
      
      <Panel title="New account" className={panelClass}>
        <OperatorNewEndUserForm
          formAction={createResellerEndUserAction}
          cancelHref="/reseller/users"
          idPrefix="reseller-new"
          validityOptions={validityOptions}
          tariffs={tariffs}
          customPlanId={customPlanId}
          addonPackages={addonPackages}
        />
      </Panel>
    </div>
  );
}
