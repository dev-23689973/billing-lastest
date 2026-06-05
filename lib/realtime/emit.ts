import { publishRealtime } from "@/lib/realtime/pusher-server";
import type { StaffMessageRealtimePayload, TicketRealtimePayload } from "@/lib/realtime/types";
import { userPrivateChannel } from "@/lib/realtime/channels";
import { getPusherServer } from "@/lib/realtime/pusher-server";

/** Fire-and-forget — never blocks HTTP response on publish failure. */
function fire(promise: Promise<void>): void {
  void promise.catch(() => {});
}

export function emitTicketCreated(data: TicketRealtimePayload): void {
  fire(publishRealtime({ event: "ticket.created", data }));
}

export function emitTicketUpdated(data: TicketRealtimePayload): void {
  fire(publishRealtime({ event: "ticket.updated", data }));
}

export function emitTicketComment(data: TicketRealtimePayload): void {
  fire(publishRealtime({ event: "ticket.comment", data }));
}

export function emitTicketDeleted(data: TicketRealtimePayload): void {
  fire(publishRealtime({ event: "ticket.deleted", data }));
}

/** Notify each recipient's private channel (batch trigger). */
export function emitStaffMessageCreated(
  data: StaffMessageRealtimePayload,
  recipientUsernames: string[],
): void {
  const pusher = getPusherServer();
  if (!pusher) return;
  const envelope = { event: "staff_message.created" as const, data };
  const channels = [
    ...new Set(recipientUsernames.map((u) => userPrivateChannel(u)).filter(Boolean)),
  ];
  if (channels.length < 1) return;
  fire(
    (async () => {
      try {
        const chunk = 10;
        for (let i = 0; i < channels.length; i += chunk) {
          const batch = channels.slice(i, i + chunk);
          await pusher.trigger(batch, envelope.event, envelope.data);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("[realtime] staff_message.created publish failed", e);
        }
      }
    })(),
  );
}

export function emitStaffMessageDismissed(data: StaffMessageRealtimePayload): void {
  fire(publishRealtime({ event: "staff_message.dismissed", data }));
}

export function emitStaffMessageRead(data: StaffMessageRealtimePayload): void {
  fire(publishRealtime({ event: "staff_message.read", data }));
}
