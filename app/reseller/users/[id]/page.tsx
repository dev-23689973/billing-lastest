import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { OperatorUserEditPage } from "@/components/portal/OperatorUserEditPage";
import { OperatorUserEditQueryAlerts } from "@/components/portal/OperatorUserEditQueryAlerts";
import { toEndUserEditClientDto } from "@/lib/dto/subscribers";
import { getSession } from "@/lib/session";
import { getUserByIdScoped, getDeductionsConfig } from "@/lib/data";
import { safePortalUsersRedirectPath } from "@/lib/portalUsersRedirectPath";
import { buildValidityOptionsFromDeductionRows } from "@/lib/validityOptions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    ok?: string;
    error?: string;
    bal?: string;
    req?: string;
    max?: string;
    renew_acc?: string;
    list?: string;
  }>;
};

export default async function ResellerUserEditPage({ params, searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?error=forbidden");

  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const u = await getUserByIdScoped({ ownerType: "SRSLR", ownerUsername: s.username, id: decodeURIComponent(id) });
  if (!u) notFound();

  const cfg = await getDeductionsConfig();
  const validityOptions = buildValidityOptionsFromDeductionRows(cfg.rows, {
    monthFree: cfg.monthFree,
    trialLabel: "2 Days Trial",
  });

  const detailReturnPath = `/reseller/users/${encodeURIComponent(u.id)}`;
  const usersListReturnPath = safePortalUsersRedirectPath(String(sp.list ?? ""), "/reseller");

  return (
    <div className="space-y-4">
      <PageHeader title="Edit users" breadcrumb={`Home > Users > ${u.username}`} />
      <OperatorUserEditQueryAlerts ok={sp.ok} error={sp.error} bal={sp.bal} req={sp.req} max={sp.max} renew_acc={sp.renew_acc} />
      <OperatorUserEditPage
        u={toEndUserEditClientDto(u)}
        portalBase="/reseller"
        portalRole="SRSLR"
        detailReturnPath={detailReturnPath}
        usersListReturnPath={usersListReturnPath}
        recoverBonusEnabled={cfg.recoverBonus}
        validityOptions={validityOptions}
      />
    </div>
  );
}