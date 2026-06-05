import { getClientIpFromRequest } from "@/lib/requestClientIp";

/** Same-origin lookup: reads proxy headers on this HTTP request (browser → app). */
export async function GET(request: Request) {
  const ip = getClientIpFromRequest({ headers: request.headers });
  return Response.json({ ip: ip ?? null }, { headers: { "Cache-Control": "no-store" } });
}
