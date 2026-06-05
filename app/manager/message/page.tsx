import { redirect } from "next/navigation";
import { ManagerMessagesPage } from "@/components/portal/ManagerMessagesPage";
import { getSession } from "@/lib/session";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerMessagePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?error=forbidden");
  const sp = (await searchParams) ?? {};
  return (
    <ManagerMessagesPage
      operatorUsername={s.username}
      displayName={s.displayName ?? s.username}
      searchParams={sp}
    />
  );
}
