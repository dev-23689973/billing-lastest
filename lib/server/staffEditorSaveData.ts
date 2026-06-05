import { POST as postAdminStaffEditor } from "@/app/api/admin/staff-editor/route";
import { POST as postManagerStaffEditor } from "@/app/api/manager/staff-editor/route";
import { POST as postResellerStaffEditor } from "@/app/api/reseller/staff-editor/route";
import type { StaffEditorPortal } from "@/lib/server/staffEditorModalData";

export type StaffEditorSaveBody = Record<string, unknown>;

export type StaffEditorSaveResult =
  | { ok: true }
  | { ok: false; error?: string; balance?: number; required?: number; status?: number };

async function readStaffEditorResponse(res: Response): Promise<StaffEditorSaveResult> {
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    balance?: number;
    required?: number;
  };
  if (res.ok && data.ok !== false) return { ok: true };
  return {
    ok: false,
    error: data.error,
    balance: data.balance,
    required: data.required,
    status: res.status,
  };
}

export async function saveStaffEditorForClient(portal: StaffEditorPortal, body: StaffEditorSaveBody) {
  const req = new Request("http://internal/staff-editor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const handler =
    portal === "manager"
      ? postManagerStaffEditor
      : portal === "reseller"
        ? postResellerStaffEditor
        : postAdminStaffEditor;

  const res = await handler(req);
  return readStaffEditorResponse(res);
}
