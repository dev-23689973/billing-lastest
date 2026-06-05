import { getSession } from "@/lib/session";
import { listItvByGenreId } from "@/lib/repos/tickets";
import { apiJson } from "@/lib/dto/apiJson";

function canReadTicketChannels(s: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return s.type === "ROOT" || s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR";
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !canReadTicketChannels(s)) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }
  const channels = await listItvByGenreId(id);
  return apiJson(channels);
}

