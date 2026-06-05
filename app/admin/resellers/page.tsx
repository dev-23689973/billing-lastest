import { redirect } from "next/navigation";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** Legacy staff list — unified under `/admin/managers`. */
export default async function LegacyAdminResellersListRedirect({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = new URLSearchParams();
  q.set("type", "reseller");
  for (const [key, value] of Object.entries(sp)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== "" && key !== "type") q.set(key, v);
  }
  const query = q.toString();
  redirect(query ? `/admin/managers?${query}` : "/admin/managers?type=reseller");
}
