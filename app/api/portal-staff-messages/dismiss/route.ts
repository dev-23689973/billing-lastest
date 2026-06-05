import { dismissPortalStaffMessageRecipient } from "@/lib/repos/portalStaffMessages";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !(session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR")) {
    return apiJson({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let recipientId = 0;
  try {
    const body = (await req.json()) as { recipientId?: number };
    recipientId = Math.floor(Number(body.recipientId ?? 0));
  } catch {
    return apiJson({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!recipientId) {
    return apiJson({ ok: false, error: "invalid_recipient" }, { status: 400 });
  }

  const ok = await dismissPortalStaffMessageRecipient(recipientId, session.username);
  return apiJson({ ok }, { headers: { "Cache-Control": "private, no-store" } });
}

