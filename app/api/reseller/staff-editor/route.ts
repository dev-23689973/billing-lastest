import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/dto/apiJson";
import { getDealerById } from "@/lib/data";
import { parseHierarchyAddCreditApplyPromo, parseRecoverGrantTxIds } from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
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
  if (!session || session.type !== "SRSLR") {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const reseller = session.username.trim();
  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "profile" | "credits";
        type?: "DEALER";
        username?: string;
        name?: string;
        password?: string;
        status?: string;
        comments?: string;
        operation?: string;
        credits?: number;
        grantTxIds?: number[];
        apply_promo?: string | number | boolean | null;
        applyPromo?: string | number | boolean | null;
      }
    | null;

  if (!body?.mode || body.type !== "DEALER" || !body?.username) {
    return apiJson({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const username = String(body.username).trim();
  if (!(await resellerOwnsDealer(reseller, username))) {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (body.mode === "profile") {
    const name = String(body.name ?? "").trim();
    const passwordInput = String(body.password ?? "").trim();
    const status = normUserStatus(String(body.status ?? "A"));
    const comments = String(body.comments ?? "");
    if (!username) {
      return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const cur = await getDealerById(username);
    if (!cur) return apiJson({ ok: false, error: "not_found" }, { status: 404 });
    const password = passwordInput || cur.passwordPlaceholder || "";
    if (!password) return apiJson({ ok: false, error: "missing_fields" }, { status: 400 });
    await repo.updateDealer({
      username,
      name,
      password,
      status,
      username_owner: reseller,
      tickets_enable: cur?.tickets_enable ?? 0,
      comments,
    });
    revalidatePaths("/reseller/dealers", `/reseller/dealers/${encodeURIComponent(username)}`);
    return apiJson({ ok: true });
  }

  if (body.mode === "credits") {
    const op = parseCreditOperation(String(body.operation ?? ""));
    const grantTxIds = parseRecoverGrantTxIds(body.grantTxIds);

    if (op === "RECOVER" && grantTxIds.length > 0) {
      const r = await repo.recoverHierarchyCreditsByGrantTxIds({
        kind: "hierarchy",
        targetUsername: username,
        targetType: "RSLR",
        ownerUsername: reseller,
        grantTxIds,
        operatorUsername: session.username,
        portal: "reseller_dealer",
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
      revalidatePaths("/reseller/dealers", `/reseller/dealers/${encodeURIComponent(username)}`);
      return apiJson({ ok: true });
    }

    const credits = Number.parseInt(String(body.credits ?? ""), 10);
    if (!op || !Number.isFinite(credits) || credits < 1) {
      return apiJson({ ok: false, error: "invalid_credits" }, { status: 400 });
    }

    const r = await repo.adjustHierarchyCredits({
      targetUsername: username,
      targetType: "RSLR",
      operation: op,
      credits,
      operatorUsername: session.username,
      portal: "reseller_dealer",
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
    revalidatePaths("/reseller/dealers", `/reseller/dealers/${encodeURIComponent(username)}`);
    return apiJson({ ok: true });
  }

  return apiJson({ ok: false, error: "invalid_mode" }, { status: 400 });
}
