/** Pusher-js sends auth as application/x-www-form-urlencoded (not JSON). */
export type PusherAuthRequestBody = {
  socket_id?: string;
  channel_name?: string;
};

export async function parsePusherAuthRequest(req: Request): Promise<PusherAuthRequestBody> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    return pickAuthFields(json);
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    if (form) {
      return {
        socket_id: form.get("socket_id")?.toString(),
        channel_name: form.get("channel_name")?.toString(),
      };
    }
  }

  const text = await req.text().catch(() => "");
  if (!text.trim()) return {};

  try {
    if (text.trim().startsWith("{")) {
      return pickAuthFields(JSON.parse(text) as Record<string, unknown>);
    }
  } catch {
    /* fall through to urlencoded */
  }

  const params = new URLSearchParams(text);
  return {
    socket_id: params.get("socket_id") ?? undefined,
    channel_name: params.get("channel_name") ?? undefined,
  };
}

function pickAuthFields(raw: Record<string, unknown> | null | undefined): PusherAuthRequestBody {
  if (!raw) return {};
  return {
    socket_id: typeof raw.socket_id === "string" ? raw.socket_id : undefined,
    channel_name: typeof raw.channel_name === "string" ? raw.channel_name : undefined,
  };
}
