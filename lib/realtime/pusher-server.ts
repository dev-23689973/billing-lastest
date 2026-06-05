import Pusher from "pusher";
import { isRealtimeServerConfigured } from "@/lib/realtime/config";
import type { RealtimeEnvelope } from "@/lib/realtime/types";
import {
  TICKETS_ADMIN_CHANNEL,
  TICKETS_PORTAL_CHANNEL,
  userPrivateChannel,
} from "@/lib/realtime/channels";

export function isRealtimeConfigured(): boolean {
  return isRealtimeServerConfigured();
}

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!isRealtimeConfigured()) return null;
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!.trim(),
      key: process.env.PUSHER_KEY!.trim(),
      secret: process.env.PUSHER_SECRET!.trim(),
      cluster: process.env.PUSHER_CLUSTER!.trim(),
      useTLS: true,
    });
  }
  return pusherInstance;
}

async function trigger(channels: string[], envelope: RealtimeEnvelope): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher || channels.length < 1) return;
  const unique = [...new Set(channels)];
  try {
    await pusher.trigger(unique, envelope.event, envelope.data);
  } catch (e) {
    console.error("[realtime] publish failed", envelope.event, e);
  }
}

export async function publishRealtime(envelope: RealtimeEnvelope): Promise<void> {
  if (!isRealtimeConfigured()) return;

  if (envelope.event.startsWith("ticket.")) {
    await trigger([TICKETS_ADMIN_CHANNEL, TICKETS_PORTAL_CHANNEL], envelope);
    return;
  }

  if (envelope.event === "staff_message.dismissed" || envelope.event === "staff_message.read") {
    const channels: string[] = [];
    if (envelope.data.username) channels.push(userPrivateChannel(envelope.data.username));
    if (channels.length) await trigger(channels, envelope);
  }
}
