import { apiJson } from "@/lib/dto/apiJson";
import * as repo from "@/lib/repos/billing";
import { clearSession, createSession, getSession } from "@/lib/session";

function roleLabel(type: string): string {
  switch (type) {
    case "ROOT":
      return "Administrator";
    case "MNGR":
      return "Manager";
    case "SRSLR":
      return "Reseller";
    case "RSLR":
      return "Dealer";
    default:
      return type;
  }
}

function statusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "S" || s === "INACTIVE") return "Suspended";
  return "Active";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const profile = await repo.getSessionUserProfile(session.username);
  if (!profile) {
    return apiJson({ error: "not_found" }, { status: 404 });
  }

  return apiJson({
    ...profile,
    roleLabel: roleLabel(profile.type),
    statusLabel: statusLabel(profile.status),
    displayName: session.displayName,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        comments?: string;
        new_password?: string;
        old_password?: string;
        new_confirm_password?: string;
      }
    | null;

  if (!body) {
    return apiJson({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const comments = String(body.comments ?? "");
  const newPassword = String(body.new_password ?? "");
  const oldPassword = String(body.old_password ?? "");
  const newConfirm = String(body.new_confirm_password ?? "");

  if (!name) {
    return apiJson({ ok: false, error: "missing_name" }, { status: 400 });
  }

  const updated = await repo.updateSessionUserProfile({
    username: session.username,
    name,
    comments,
  });
  if (!updated) {
    return apiJson({ ok: false, error: "save_failed" }, { status: 500 });
  }

  let passwordChanged = false;
  if (newPassword.trim()) {
    if (oldPassword.length < 3 || oldPassword.length > 100) {
      return apiJson({ ok: false, error: "old_len" }, { status: 400 });
    }
    if (newPassword.length < 4 || newPassword.length > 12 || newConfirm.length < 4 || newConfirm.length > 12) {
      return apiJson({ ok: false, error: "new_len" }, { status: 400 });
    }
    if (newPassword !== newConfirm) {
      return apiJson({ ok: false, error: "match" }, { status: 400 });
    }
    const ok = await repo.verifyUserPassword(session.username, oldPassword);
    if (!ok) {
      return apiJson({ ok: false, error: "old" }, { status: 400 });
    }
    await repo.setUserPassword(session.username, newPassword);
    passwordChanged = true;
    await clearSession();
    return apiJson({ ok: true, passwordChanged: true });
  }

  await createSession({
    userid: session.userid,
    displayName: name || session.username,
    username: session.username,
    type: session.type,
    owner: session.owner,
    lastLogin: session.lastLogin,
  });

  return apiJson({ ok: true, passwordChanged });
}
