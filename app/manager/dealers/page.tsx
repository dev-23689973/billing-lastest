import { redirect } from "next/navigation";

/** Dealers are listed on the unified resellers staff hub. */
export default async function ManagerDealersRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== "") params.set(key, v);
  }
  if (!params.has("type")) params.set("type", "dealer");
  const q = params.toString();
  redirect(q ? `/manager/resellers?${q}` : "/manager/resellers?type=dealer");
}
