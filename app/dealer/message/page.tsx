import { redirect } from "next/navigation";
import { DealerMessagesPage } from "@/components/portal/DealerMessagesPage";
import { getSession } from "@/lib/session";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DealerMessagePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "RSLR") redirect("/login?error=forbidden");
  const sp = (await searchParams) ?? {};
  return (
    <DealerMessagesPage
      operatorUsername={s.username}
      displayName={s.displayName ?? s.username}
      searchParams={sp}
    />
  );
}
