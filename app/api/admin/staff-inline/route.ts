import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  getDealerByUsername,
  getManagerByUsername,
  getResellerByUsername,
  updateDealer,
  updateDealerName,
  updateDealerStatus,
  updateManager,
  updateManagerName,
  updateManagerStatus,
  updateReseller,
  updateResellerName,
  updateResellerStatus,
} from "@/lib/repos/billing";
import { apiJson } from "@/lib/dto/apiJson";

type StaffType = "MANAGER" | "RESELLER" | "DEALER";
type EditableField = "name" | "password" | "status";

function isStaffType(v: string): v is StaffType {
  return v === "MANAGER" || v === "RESELLER" || v === "DEALER";
}

function isField(v: string): v is EditableField {
  return v === "name" || v === "password" || v === "status";
}

function revalidateStaffList(rowType: StaffType, field: EditableField) {
  if (field === "status") return;
  revalidatePath("/admin/managers");
  if (rowType === "RESELLER" || rowType === "DEALER") revalidatePath("/admin/managers");
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "ROOT") return apiJson({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { rowType?: string; username?: string; field?: string; value?: string }
    | null;
  if (!body) return apiJson({ error: "bad_request" }, { status: 400 });

  const rowType = String(body.rowType ?? "");
  const username = String(body.username ?? "").trim();
  const field = String(body.field ?? "");
  const value = String(body.value ?? "").trim();
  if (!isStaffType(rowType) || !isField(field) || !username || !value) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  if (field === "status" && value !== "A" && value !== "S") {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  if (rowType === "MANAGER") {
    if (field === "status") {
      const ok = await updateManagerStatus(username, value as "A" | "S");
      if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
    } else if (field === "name") {
      const ok = await updateManagerName(username, value);
      if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
    } else {
      const cur = await getManagerByUsername(username);
      if (!cur) return apiJson({ error: "not_found" }, { status: 404 });
      await updateManager({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        comments: cur.comments ?? "",
      });
    }
  } else if (rowType === "RESELLER") {
    if (field === "status") {
      const ok = await updateResellerStatus(username, value as "A" | "S");
      if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
    } else if (field === "name") {
      const ok = await updateResellerName(username, value);
      if (!ok) return apiJson({ error: "not_found" }, { status: 404 });
    } else {
      const cur = await getResellerByUsername(username);
      if (!cur) return apiJson({ error: "not_found" }, { status: 404 });
      await updateReseller({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        manager: cur.manager,
        comments: cur.comments ?? "",
      });
    }
  } else {
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
        username_owner: cur.reseller,
        tickets_enable: cur.tickets_enable,
        comments: cur.comments ?? "",
      });
    }
  }

  revalidateStaffList(rowType, field);
  return apiJson({ ok: true });
}
