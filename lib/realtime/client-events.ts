/** DOM events dispatched when Pusher delivers a message (decouples UI from provider). */
export const BILLING_REALTIME_TICKET_EVENT = "billing:realtime:ticket";
export const BILLING_REALTIME_MESSAGE_EVENT = "billing:realtime:message";
export const BILLING_REALTIME_PRESENCE_EVENT = "billing:realtime:presence";
/** Sidebar logo credits pill — refetch after hierarchy credit add/recover. */
export const BILLING_HEADER_STATS_EVENT = "billing:header-stats:refresh";
/** Staff hub table rows — refresh server-rendered credits/name after editor mutations. */
export const BILLING_STAFF_HUB_LIST_REFRESH_EVENT = "billing:staff-hub-list:refresh";

export function dispatchBillingRealtimeTicket(detail: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_REALTIME_TICKET_EVENT, { detail }));
}

export function dispatchBillingRealtimeMessage(detail: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_REALTIME_MESSAGE_EVENT, { detail }));
}

export function dispatchBillingRealtimePresence(detail: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_REALTIME_PRESENCE_EVENT, { detail }));
}

export function dispatchBillingHeaderStatsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_HEADER_STATS_EVENT));
}

export function dispatchStaffHubListRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_STAFF_HUB_LIST_REFRESH_EVENT));
}
