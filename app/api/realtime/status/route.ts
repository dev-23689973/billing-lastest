import { getRealtimePublicConfig, isRealtimeServerConfigured } from "@/lib/realtime/config";
import { apiJson } from "@/lib/dto/apiJson";

/** Debug: whether realtime can run (no secrets returned). */
export async function GET() {
  const pub = getRealtimePublicConfig();
  const server = isRealtimeServerConfigured();
  return apiJson({
    ok: Boolean(pub && server),
    server,
    client: Boolean(pub),
    cluster: pub?.cluster ?? null,
    hasKey: Boolean(pub?.key),
  });
}

