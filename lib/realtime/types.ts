/** Realtime event names (Pusher `event` field). */
export type RealtimeEventName =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.comment"
  | "ticket.deleted"
  | "staff_message.created"
  | "staff_message.dismissed"
  | "staff_message.read";

export type TicketRealtimePayload = {
  ticketId: number;
  subject?: string;
  statusId?: number;
  priorityId?: number;
  userId?: number;
  actorUsername?: string;
};

export type StaffMessageRealtimePayload = {
  messageId: number;
  recipientId?: number;
  username?: string;
  recipientCount?: number;
  sentBy?: string;
};

export type RealtimeEnvelope =
  | { event: "ticket.created" | "ticket.updated" | "ticket.comment" | "ticket.deleted"; data: TicketRealtimePayload }
  | {
      event: "staff_message.created" | "staff_message.dismissed" | "staff_message.read";
      data: StaffMessageRealtimePayload;
    };
