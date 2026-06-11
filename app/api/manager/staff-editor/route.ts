import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/dto/apiJson";
import { getDealerById, getResellerById } from "@/lib/data";
import { parseHierarchyAddCreditApplyPromo, parseRecoverGrantTxIds } from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import { managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
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
  if (!session || session.type !== "MNGR") {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const mgr = session.username.trim();
  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "profile" | "credits";
        type?: "RESELLER" | "DEALER";
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
        apply_promo?: string | number | boolean | null;
        applyPromo?: string | number | boolean | null;
      }
    | null;

  if (!body?.mode || !body?.type || !body?.username) {
    return apiJson({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const type = body.type;
  const username = String(body.username).trim();
  if (type !== "RESELLER" && type !== "DEALER") {
    return apiJson({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (body.mode === "profile") {
    const name = String(body.name ?? "").trim();
    const passwordInput = String(body.password ?? "").trim();
    const status = normUserStatus(String(body.status ?? "A"));
    const comments = String(body.comments ?? "");
    if (!username) {
      return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    if (type === "RESELLER") {
      if (!(await managerOwnsReseller(mgr, username))) {
        return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
      }
      const existing = await getResellerById(username);
      if (!existing) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
      const password = passwordInput || existing.password || "";
      if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
      await repo.updateReseller({
        username,
        name,
        password,
        status,
        manager: mgr,
        comments,
        tickets_enable: existing.tickets_enable,
      });
      revalidatePaths("/manager/resellers");
      return apiJson({ ok: true });
    }

    if (!(await managerOwnsDealer(mgr, username))) {
      return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const username_owner = String(body.username_owner ?? "").trim();
    if (!username_owner || !(await managerOwnsReseller(mgr, username_owner))) {
      return apiJson({ ok: false, error: "missing_owner" }, { status: 400 });
    }
    const existing = await getDealerById(username);
    if (!existing) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
    const password = passwordInput || existing.passwordPlaceholder || "";
    if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    await repo.updateDealer({
      username,
      name,
      password,
      status,
      username_owner,
      tickets_enable: existing.tickets_enable,
      comments,
    });
    revalidatePaths("/manager/resellers");
    return apiJson({ ok: true });
  }

  if (body.mode === "credits") {
    const op = parseCreditOperation(String(body.operation ?? ""));
    const grantTxIds = parseRecoverGrantTxIds(body.grantTxIds);

    if (op === "RECOVER" && grantTxIds.length > 0) {
      if (type === "RESELLER") {
        if (!(await managerOwnsReseller(mgr, username))) {
          return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
        }
        const r = await repo.recoverHierarchyCreditsByGrantTxIds({
          kind: "hierarchy",
          targetUsername: username,
          targetType: "SRSLR",
          ownerUsername: mgr,
          grantTxIds,
          operatorUsername: session.username,
          portal: "manager_reseller",
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

      if (!(await managerOwnsDealer(mgr, username))) {
        return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
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
        portal: "manager_dealer",
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

    if (type === "RESELLER") {
      if (!(await managerOwnsReseller(mgr, username))) {
        return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } else if (!(await managerOwnsDealer(mgr, username))) {
      return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const r = await repo.adjustHierarchyCredits({
      targetUsername: username,
      targetType: type === "RESELLER" ? "SRSLR" : "RSLR",
      operation: op,
      credits,
      operatorUsername: session.username,
      portal: type === "RESELLER" ? "manager_reseller" : "manager_dealer",
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
