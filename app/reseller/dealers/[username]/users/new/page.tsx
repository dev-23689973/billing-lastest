import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDeductionsConfig, listStalkerTariffPlans, resellerOwnsDealer } from "@/lib/data";
import { getStalkerCustomPackagePlanId, listStalkerPackagesForPlan } from "@/lib/repos/stalkerUserPackages";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { OperatorNewEndUserForm } from "@/components/portal/OperatorNewEndUserForm";
import { createResellerDealerEndUserAction } from "@/actions/forms";
import { buttonOutlineLinkClassName } from "@/components/ui/button";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { newEndUserCreationFlashItems } from "@/lib/urlFlashToasts";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";
import { requirePortalStaffCanCreateSubscriber } from "@/lib/portal/requirePortalStaffCanCreateSubscriber";

type Props = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ error?: string; bal?: string; req?: string }>;
};

export default async function ResellerDealerNewUserPage({ params, searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?error=forbidden");

  const { username: raw } = await params;
  const dealerLogin = decodeURIComponent(raw);
  if (!(await resellerOwnsDealer(s.username, dealerLogin))) {
    redirect("/reseller/dealers?error=forbidden");
  }

  const sp = (await searchParams) ?? {};
  const newUserFlashes = newEndUserCreationFlashItems(sp, "reseller_dealer_nested");

  const usersListPath = `/reseller/dealers/${encodeURIComponent(dealerLogin)}/users`;
  await requirePortalStaffCanCreateSubscriber(s, usersListPath, { dealerLogin });

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
    "overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add user"
        breadcrumb={
          <>
            <Link href="/reseller/dealers" className="text-primary hover:underline">
              Dealers
            </Link>
            <span className="text-muted-foreground"> · </span>
            <Link href={usersListPath} className="text-primary hover:underline">
              {dealerLogin}
            </Link>
            <span className="text-muted-foreground"> · </span>
            <span className="text-foreground">New</span>
          </>
        }
        showBack={false}
        actions={
          <Link href={usersListPath} className={buttonOutlineLinkClassName("bg-card shadow-sm")}>
            Back to list
          </Link>
        }
      />
      
      <Panel title="New account" className={panelClass}>
        <OperatorNewEndUserForm
          formAction={createResellerDealerEndUserAction}
          cancelHref={usersListPath}
          idPrefix={`srl-dlr-${dealerLogin.replace(/[^a-zA-Z0-9_-]/g, "")}`}
          validityOptions={validityOptions}
          tariffs={tariffs}
          customPlanId={customPlanId}
          addonPackages={addonPackages}
          ownedByDealer={dealerLogin}
        />
      </Panel>
    </div>
  );
}
