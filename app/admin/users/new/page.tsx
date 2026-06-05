import Link from "next/link";
import { getDeductionsConfig, listResellersForSelect, listStalkerTariffPlans } from "@/lib/data";
import { getStalkerCustomPackagePlanId, listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { NewUserForm } from "./NewUserForm";
import { buttonOutlineLinkClassName } from "@/components/ui/button";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { newEndUserCreationFlashItems } from "@/lib/urlFlashToasts";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";

type Props = {
  searchParams?: Promise<{ error?: string; bal?: string; req?: string }>;
};

export default async function NewUserPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const newUserFlashes = newEndUserCreationFlashItems(sp, "admin");

  const [resellers, cfg, tariffs, customPlanId] = await Promise.all([
    listResellersForSelect(),
    getDeductionsConfig(),
    listStalkerTariffPlans(),
    getStalkerCustomPackagePlanId(),
  ]);
  const addonPackages =
    customPlanId != null && Number.isFinite(customPlanId) && customPlanId > 0
      ? await listStalkerPackagesForPlan(customPlanId)
      : [];
  const validityOptions = buildValidityOptionsFromDeductionRows(cfg.rows, { monthFree: cfg.monthFree });

  return (
    <div>
      <PageHeader
        title="Add user"
        breadcrumb={
          <>
            <Link href="/admin/dashboard" className="text-primary hover:underline">
              Home
            </Link>
            <span className="text-muted-foreground"> · </span>
            <Link href="/admin/users" className="text-primary hover:underline">
              Users
            </Link>
            <span className="text-muted-foreground"> · </span>
            <span className="text-foreground">New</span>
          </>
        }
        actions={
          <Link href="/admin/users" className={buttonOutlineLinkClassName("bg-card shadow-sm")}>
            Back to users
          </Link>
        }
      />
      
      <Panel
        title="New account"
        className="overflow-hidden rounded-2xl border-border/60 bg-transparent shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      >
        <NewUserForm
          resellers={resellers}
          tariffs={tariffs}
          validityOptions={validityOptions}
          customPlanId={customPlanId}
          addonPackages={addonPackages}
        />
      </Panel>
    </div>
  );
}
