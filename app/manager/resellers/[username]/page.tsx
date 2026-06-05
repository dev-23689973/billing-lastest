import { redirect } from "next/navigation";
import { buildStaffHubRedirectUrl } from "@/lib/staff/legacyStaffHubRedirect";

type Props = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy full-page edit removed — manager staff hub + row modals. */
export default async function LegacyManagerResellerEditRedirect({ params, searchParams }: Props) {
  const { username: id } = await params;
  const sp = (await searchParams) ?? {};
  const username = decodeURIComponent(id).trim();
  redirect(buildStaffHubRedirectUrl("/manager/resellers", username, sp));
}
