export type TicketRealtimeDetail = {
  event?: string;
  data?: { ticketId?: number; statusId?: number; actorUsername?: string };
};

/** True when the current user triggered this ticket realtime event. */
export function isSelfTicketRealtimeEvent(
  detail: TicketRealtimeDetail | undefined,
  viewerUsername: string,
): boolean {
  const actor = detail?.data?.actorUsername?.trim().toLowerCase();
  const viewer = viewerUsername.trim().toLowerCase();
  return Boolean(actor && viewer && actor === viewer);
}
