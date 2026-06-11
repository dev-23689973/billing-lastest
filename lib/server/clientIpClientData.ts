import { headers } from "next/headers";
import { getClientIpFromRequest } from "@/lib/requestClientIp";

/** Resolve visitor IP from incoming request headers (served via `resolveClientPublicIpAction`). */
export async function resolveClientIpForClient(): Promise<{ ip: string | null }> {
  const h = await headers();
  const ip = getClientIpFromRequest({ headers: h });
  return { ip: ip ?? null };
}
