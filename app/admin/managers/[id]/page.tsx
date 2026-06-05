import { redirect } from "next/navigation";
import { buildStaffHubRedirectUrl } from "@/lib/staff/legacyStaffHubRedirect";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy full-page edit removed — staff list + row modals handle profile, credits, and transactions. */
export default async function LegacyManagerEditRedirect({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const username = decodeURIComponent(id).trim();
  redirect(buildStaffHubRedirectUrl("/admin/managers", username, sp));
}
