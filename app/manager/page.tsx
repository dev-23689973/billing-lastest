import { redirect } from "next/navigation";

import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";
import { getSession } from "@/lib/session";

export default async function ManagerDashboardPage() {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?error=forbidden");

  return (
    <DashboardPageContent
      scope="manager"
      managerUsername={s.username}
      portalBase="/manager"
    />
  );
}
