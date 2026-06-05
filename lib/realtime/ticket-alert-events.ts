/** Fired after a portal user dismisses a ticket from the header bell (refresh open-ticket count). */
export const BILLING_TICKET_ALERT_DISMISS_CHANGED = "billing:ticket-alert-dismiss-changed";

export function dispatchTicketAlertDismissChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BILLING_TICKET_ALERT_DISMISS_CHANGED));
}
