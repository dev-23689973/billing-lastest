import { headers } from "next/headers";
import { getClientIpFromRequest } from "@/lib/requestClientIp";

/** Resolve visitor IP from incoming request headers (same as `/api/client-ip`). */
export async function resolveClientIpForClient(): Promise<{ ip: string | null }> {
  const h = await headers();
  const ip = getClientIpFromRequest({ headers: h });
  return { ip: ip ?? null };
}
