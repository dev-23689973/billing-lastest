import { revalidatePath } from "next/cache";
import {
  getDealerByUsername,
  updateDealer,
  updateDealerName,
  updateDealerStatus,
} from "@/lib/repos/billing";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

type EditableField = "name" | "password" | "status";

function isField(v: string): v is EditableField {
  return v === "name" || v === "password" || v === "status";
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") return apiJson({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { rowType?: string; username?: string; field?: string; value?: string }
    | null;
  if (!body) return apiJson({ error: "bad_request" }, { status: 400 });

  const rowType = String(body.rowType ?? "");
  const username = String(body.username ?? "").trim();
  const field = String(body.field ?? "");
  const value = String(body.value ?? "").trim();
  if (rowType !== "DEALER" || !isField(field) || !username || !value) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }
  if (field === "status" && value !== "A" && value !== "S") {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  const reseller = s.username.trim();
  if (!(await resellerOwnsDealer(reseller, username))) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  if (field === "status") {
    const ok = await updateDealerStatus(username, value as "A" | "S");
    if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
  } else if (field === "name") {
    const ok = await updateDealerName(username, value);
    if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
  } else {
    const cur = await getDealerByUsername(username);
    if (!cur) return apiJson({ error: "not_found" }, { status: 404 });
    await updateDealer({
      username,
      name: cur.name,
      password: value,
      status: cur.status,
      username_owner: reseller,
      tickets_enable: cur.tickets_enable,
      comments: cur.comments ?? "",
    });
  }

  if (field !== "status") {
    revalidatePath("/reseller/dealers");
    revalidatePath(`/reseller/dealers/${encodeURIComponent(username)}`);
  }
  return apiJson({ ok: true });
}
