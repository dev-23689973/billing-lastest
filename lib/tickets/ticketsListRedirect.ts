export type TicketsListLegacySearchParams = {
  ok?: string;
  error?: string;
  filter?: string;
  status?: string;
};

/** Map legacy `/tickets` and `/tickets/complete` URLs to the dashboard ticket queue. */
export function ticketsListRedirect(
  portalBase: "/admin" | "/manager" | "/reseller" | "/dealer",
  sp: TicketsListLegacySearchParams = {},
): string {
  const q = new URLSearchParams();
  if (sp.filter === "completed") q.set("status", "2");
  else {
    const status = String(sp.status ?? "").trim();
    if (status) q.set("status", status);
  }
  if (sp.ok) q.set("ok", sp.ok);
  if (sp.error) q.set("error", sp.error);
  const qs = q.toString();
  return `${portalBase}/tickets/dashboard${qs ? `?${qs}` : ""}`;
}

export function ticketDetailRedirect(
  portalBase: "/admin" | "/manager" | "/reseller" | "/dealer",
  ticketId: number,
  sp: Pick<TicketsListLegacySearchParams, "ok" | "error"> = {},
): string {
  const q = new URLSearchParams();
  q.set("ticket", String(ticketId));
  if (sp.ok) q.set("ok", sp.ok);
  if (sp.error) q.set("error", sp.error);
  return `${portalBase}/tickets/dashboard?${q.toString()}`;
}
