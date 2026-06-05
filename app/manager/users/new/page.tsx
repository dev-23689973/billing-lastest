import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { ManagerNewUserForm } from "@/components/portal/ManagerNewUserForm";
import { getSession } from "@/lib/session";
import * as managerPortal from "@/lib/repos/managerPortal";
import { getDeductionsConfig, listStalkerTariffPlans } from "@/lib/data";
import { getStalkerCustomPackagePlanId, listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { buttonOutlineLinkClassName } from "@/components/ui/button";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { newEndUserCreationFlashItems } from "@/lib/urlFlashToasts";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";
import { requirePortalStaffCanCreateSubscriber } from "@/lib/portal/requirePortalStaffCanCreateSubscriber";

type Props = {
  searchParams?: Promise<{ error?: string; bal?: string; req?: string }>;
};

export default async function ManagerNewUserPage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?error=forbidden");
  await requirePortalStaffCanCreateSubscriber(s, "/manager/users");

  const sp = (await searchParams) ?? {};
  const newUserFlashes = newEndUserCreationFlashItems(sp, "manager");

  const [resellers, cfg, tariffs, customPlanId] = await Promise.all([
    managerPortal.listResellersOwnedByManager(s.username),
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
            <Link href="/manager" className="text-primary hover:underline">
              Dashboard
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link href="/manager/users" className="text-primary hover:underline">
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
          <Link href="/manager/users" className={buttonOutlineLinkClassName("bg-card shadow-sm")}>
            Back to list
          </Link>
        }
      />
      
      <Panel title="New account" className={panelClass}>
        <ManagerNewUserForm
          resellers={resellers.map((r) => ({ username: r.username, name: r.name }))}
          tariffs={tariffs}
          validityOptions={validityOptions}
          customPlanId={customPlanId}
          addonPackages={addonPackages}
        />
      </Panel>
    </div>
  );
}
