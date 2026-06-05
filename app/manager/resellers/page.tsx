import { redirect } from "next/navigation";

import { ManagerStaffHubPage } from "@/components/portal/ManagerStaffHubPage";
import { getSession } from "@/lib/session";

export default async function ManagerResellersRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session || session.type !== "MNGR") redirect("/login?error=forbidden");

  const sp = (await searchParams) ?? {};
  return <ManagerStaffHubPage managerUsername={session.username} searchParams={sp} />;
}
