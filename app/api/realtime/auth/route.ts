import { canSubscribeChannel } from "@/lib/realtime/channels";
import { parsePusherAuthRequest } from "@/lib/realtime/parse-auth-request";
import { getPusherServer, isRealtimeConfigured } from "@/lib/realtime/pusher-server";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

export async function POST(req: Request) {
  if (!isRealtimeConfigured()) {
    return apiJson({ error: "realtime_disabled" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return apiJson({ error: "unauthorized" }, { status: 401 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return apiJson({ error: "realtime_disabled" }, { status: 503 });
  }

  const body = await parsePusherAuthRequest(req);
  const socketId = body.socket_id?.trim();
  const channelName = body.channel_name?.trim();
  if (!socketId || !channelName) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  if (!canSubscribeChannel(channelName, { username: session.username, type: session.type })) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const presenceData = {
    user_id: String(session.userid),
    user_info: {
      username: session.username,
      name: session.displayName,
      type: session.type,
    },
  };

  try {
    if (channelName.startsWith("presence-")) {
      const auth = pusher.authorizeChannel(socketId, channelName, presenceData);
      return apiJson(auth);
    }
    const auth = pusher.authorizeChannel(socketId, channelName);
    return apiJson(auth);
  } catch {
    return apiJson({ error: "auth_failed" }, { status: 500 });
  }
}

