import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/dto/apiJson";
import { getDealerById, getManagerById, getResellerById } from "@/lib/data";
import { parseHierarchyAddCreditApplyPromo, parseRecoverGrantTxIds } from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import { getSession } from "@/lib/session";

function normUserStatus(v: string) {
  const u = v.toUpperCase();
  if (u === "S" || u === "INACTIVE") return "S";
  return "A";
}

function parseCreditOperation(raw: string): "ADD" | "RECOVER" | null {
  const v = raw.trim().toUpperCase();
  if (v === "ADD" || v === "CRDT") return "ADD";
  if (v === "RECOVER" || v === "DBIT") return "RECOVER";
  return null;
}

function revalidatePaths(...paths: string[]) {
  for (const path of new Set(paths)) revalidatePath(path);
}

/** POST-only — loads use `loadStaffEditorModalAction`. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "profile" | "credits";
        type?: "MANAGER" | "RESELLER" | "DEALER";
        username?: string;
        name?: string;
        password?: string;
        status?: string;
        comments?: string;
        manager?: string;
        username_owner?: string;
        tickets_manager?: string;
        operation?: string;
        credits?: number;
        grantTxIds?: number[];
        /** Form field: `"1"` promo ladder, `"0"` additional (principal only). */
        apply_promo?: string | number | boolean | null;
        applyPromo?: string | number | boolean | null;
      }
    | null;

  if (!body?.mode || !body?.type || !body?.username) {
    return apiJson({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const type = body.type;
  const username = String(body.username).trim();

  if (body.mode === "profile") {
    const name = String(body.name ?? "").trim();
    const passwordInput = String(body.password ?? "").trim();
    const status = normUserStatus(String(body.status ?? "A"));
    const comments = String(body.comments ?? "");
    if (!username) {
      return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    if (type === "MANAGER") {
      const existing = await getManagerById(username);
      if (!existing) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
      const password = passwordInput || existing.password || "";
      if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
      const tickets_enable = String(body.tickets_manager ?? "Yes") === "Yes" ? 1 : 0;
      await repo.updateManager({ username, name, password, status, comments, tickets_enable });
      revalidatePaths("/admin/managers", `/admin/managers/${encodeURIComponent(username)}`);
      return apiJson({ ok: true });
    }

    if (type === "RESELLER") {
      const manager = String(body.manager ?? "").trim();
      if (!manager) return apiJson({ ok: false, error: "missing_manager" }, { status: 400 });
      const existing = await getResellerById(username);
      if (!existing) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
      const password = passwordInput || existing.password || "";
      if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
      const tickets_enable = String(body.tickets_manager ?? "Yes") === "Yes" ? 1 : 0;
      await repo.updateReseller({ username, name, password, status, manager, comments, tickets_enable });
      revalidatePaths("/admin/managers", `/admin/resellers/${encodeURIComponent(username)}`);
      return apiJson({ ok: true });
    }

    const username_owner = String(body.username_owner ?? "").trim();
    if (!username_owner) return apiJson({ ok: false, error: "missing_owner" }, { status: 400 });
    const existing = await getDealerById(username);
    if (!existing) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
    const password = passwordInput || existing.passwordPlaceholder || "";
    if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    const tickets_enable = String(body.tickets_manager ?? "No") === "Yes" ? 1 : 0;
    await repo.updateDealer({
      username,
      name,
      password,
      status,
      username_owner,
      tickets_enable,
      comments,
    });
    revalidatePaths("/admin/managers", `/admin/dealers/${encodeURIComponent(username)}`);
    return apiJson({ ok: true });
  }

  if (body.mode === "credits") {
    const op = parseCreditOperation(String(body.operation ?? ""));
    const grantTxIds = parseRecoverGrantTxIds(body.grantTxIds);

    if (op === "RECOVER" && grantTxIds.length > 0) {
      if (type === "MANAGER") {
        const r = await repo.recoverHierarchyCreditsByGrantTxIds({
          kind: "admin_manager",
          adminUsername: session.username,
          managerUsername: username,
          grantTxIds,
          operatorUsername: session.username,
        });
        if (!r.ok) {
          return apiJson(
            {
              ok: false,
              error: r.code ?? "credits_error",
              ...(typeof r.balance === "number" ? { balance: r.balance } : {}),
              ...(typeof r.required === "number" ? { required: r.required } : {}),
            },
            { status: 400 },
          );
        }
        return apiJson({ ok: true });
      }

      if (type === "RESELLER") {
        const row = await getResellerById(username);
        if (!row?.manager) return apiJson({ ok: false, error: "missing_manager" }, { status: 400 });
        const r = await repo.recoverHierarchyCreditsByGrantTxIds({
          kind: "hierarchy",
          targetUsername: username,
          targetType: "SRSLR",
          ownerUsername: row.manager.trim(),
          grantTxIds,
          operatorUsername: session.username,
          portal: "admin_reseller",
        });
        if (!r.ok) {
          return apiJson(
            {
              ok: false,
              error: r.code ?? "credits_error",
              ...(typeof r.balance === "number" ? { balance: r.balance } : {}),
              ...(typeof r.required === "number" ? { required: r.required } : {}),
            },
            { status: 400 },
          );
        }
        return apiJson({ ok: true });
      }

      const row = await getDealerById(username);
      if (!row?.reseller) return apiJson({ ok: false, error: "missing_owner" }, { status: 400 });
      const r = await repo.recoverHierarchyCreditsByGrantTxIds({
        kind: "hierarchy",
        targetUsername: username,
        targetType: "RSLR",
        ownerUsername: row.reseller.trim(),
        grantTxIds,
        operatorUsername: session.username,
        portal: "admin_dealer",
      });
      if (!r.ok) {
        return apiJson(
          {
            ok: false,
            error: r.code ?? "credits_error",
            ...(typeof r.balance === "number" ? { balance: r.balance } : {}),
            ...(typeof r.required === "number" ? { required: r.required } : {}),
          },
          { status: 400 },
        );
      }
      return apiJson({ ok: true });
    }

    const credits = Number.parseInt(String(body.credits ?? ""), 10);
    if (!op || !Number.isFinite(credits) || credits < 1) {
      return apiJson({ ok: false, error: "invalid_credits" }, { status: 400 });
    }

    if (type === "MANAGER") {
      const r = await repo.adjustManagerCredits({
        adminUsername: session.username,
        managerUsername: username,
        operation: op,
        credits,
        operatorUsername: session.username,
        ...(op === "ADD" ? { applyPromo: parseHierarchyAddCreditApplyPromo(body.apply_promo ?? body.applyPromo) } : {}),
      });
      if (!r.ok) {
        return apiJson(
          {
            ok: false,
            error: r.code ?? "credits_error",
            ...(typeof r.balance === "number" ? { balance: r.balance } : {}),
            ...(typeof r.required === "number" ? { required: r.required } : {}),
          },
          { status: 400 },
        );
      }
      return apiJson({ ok: true });
    }

    const r = await repo.adjustHierarchyCredits({
      targetUsername: username,
      targetType: type === "RESELLER" ? "SRSLR" : "RSLR",
      operation: op,
      credits,
      operatorUsername: session.username,
      portal: type === "RESELLER" ? "admin_reseller" : "admin_dealer",
      ...(op === "ADD" ? { applyPromo: parseHierarchyAddCreditApplyPromo(body.apply_promo ?? body.applyPromo) } : {}),
    });
    if (!r.ok) {
      return apiJson(
        {
          ok: false,
          error: r.code ?? "credits_error",
          ...(typeof r.balance === "number" ? { balance: r.balance } : {}),
          ...(typeof r.required === "number" ? { required: r.required } : {}),
        },
        { status: 400 },
      );
    }
    return apiJson({ ok: true });
  }

  return apiJson({ ok: false, error: "invalid_mode" }, { status: 400 });
}
