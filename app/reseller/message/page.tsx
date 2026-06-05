import { redirect } from "next/navigation";
import { ResellerMessagesPage } from "@/components/portal/ResellerMessagesPage";
import { getSession } from "@/lib/session";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResellerMessagePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?error=forbidden");
  const sp = (await searchParams) ?? {};
  return (
    <ResellerMessagesPage
      operatorUsername={s.username}
      displayName={s.displayName ?? s.username}
      searchParams={sp}
    />
  );
}
