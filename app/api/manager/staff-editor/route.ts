import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/dto/apiJson";
import { toStaffEditorClientDto } from "@/lib/dto/staff";
import { getDealerById, getResellerById, getSettings } from "@/lib/data";
import {
  HIERARCHY_ADD_CREDITS_MAX,
  parseHierarchyAddCreditApplyPromo,
  parseRecoverGrantTxIds,
} from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import { listResellersOwnedByManager, managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
import { getSession } from "@/lib/session";
import { formatHierarchySelectLabel } from "@/lib/formatHierarchySelectLabel";

async function promoPreviewPayload(type: "RESELLER" | "DEALER", username: string) {
  const rules = await repo.getPromoBonusRules();
  const kind = type === "RESELLER" ? "SRSLR" : "RSLR";
  const activeClientsForPromo2 = await repo.countActiveClientsForPromo2({ kind, username });
  return { promoP1: rules.p1, promoP2: rules.p2, activeClientsForPromo2 };
}

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

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "MNGR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const mgr = session.username.trim();
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "").toUpperCase();
  const username = (url.searchParams.get("username") ?? "").trim();
  if (!username || (type !== "RESELLER" && type !== "DEALER")) {
    return apiJson({ error: "invalid_request" }, { status: 400 });
  }

  const settings = await getSettings().catch(() => null);
  const hierarchyAddMaxRaw = settings?.hierarchyAddCreditMax ?? String(HIERARCHY_ADD_CREDITS_MAX);
  const hierarchyAddMax = Math.min(
    HIERARCHY_ADD_CREDITS_MAX,
    Math.max(1, Number.parseInt(String(hierarchyAddMaxRaw).trim(), 10) || HIERARCHY_ADD_CREDITS_MAX),
  );
  const resellerAddMin = settings ? repo.hierarchyAddCreditsMin("manager_reseller", settings) : 1;
  const dealerAddMin = settings ? repo.hierarchyAddCreditsMin("manager_dealer", settings) : 1;

  if (type === "RESELLER") {
    if (!(await managerOwnsReseller(mgr, username))) {
      return apiJson({ error: "forbidden" }, { status: 403 });
    }
    const row = await getResellerById(username);
    if (!row) return apiJson({ error: "not_found" }, { status: 404 });
    const promo = await promoPreviewPayload("RESELLER", row.username);
    const payerCredits = await repo.getCreditBalance(mgr);
    const addCreditLadders =
      settings != null
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "manager_reseller",
            targetUsername: row.username,
            payerUsername: mgr,
            settings,
          })
        : { promoRungs: [], additionalRungs: [] };
    const reversibleGrants = await repo.listReversibleHierarchyGrants(row.username);
    return apiJson(
      toStaffEditorClientDto({
        type,
        username: row.username,
        name: row.name ?? "",
        password: row.password ?? "",
        status: row.status ?? "A",
        comments: row.comments ?? "",
        credits: Number(row.credits ?? 0),
        hierarchyAddMax,
        hierarchyAddMin: resellerAddMin,
        manager: mgr,
        payerCredits,
        addCreditLadders,
        reversibleGrants,
        ...promo,
      }),
    );
  }

  if (!(await managerOwnsDealer(mgr, username))) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }
  const row = await getDealerById(username);
  if (!row) return apiJson({ error: "not_found" }, { status: 404 });
  const ownedResellers = await listResellersOwnedByManager(mgr);
  const promo = await promoPreviewPayload("DEALER", row.username);
  const payer = (row.reseller ?? "").trim();
  const payerCredits = payer ? await repo.getCreditBalance(payer) : 0;
  const addCreditLadders =
    settings != null && payer
      ? await repo.buildHierarchyAddCreditRungs({
          portal: "manager_dealer",
          targetUsername: row.username,
          payerUsername: payer,
          settings,
        })
      : { promoRungs: [], additionalRungs: [] };
  const reversibleGrants = await repo.listReversibleHierarchyGrants(row.username);
  return apiJson(
    toStaffEditorClientDto({
      type,
      username: row.username,
      name: row.name ?? "",
      password: row.passwordPlaceholder ?? "",
      status: row.status ?? "ACTIVE",
      comments: row.comments ?? "",
      credits: Number(row.credits ?? 0),
      hierarchyAddMax,
      hierarchyAddMin: dealerAddMin,
      username_owner: row.reseller ?? "",
      tickets_manager: row.ticketsManager === "Yes" ? "Yes" : "No",
      resellerOptions: ownedResellers.map((r) => ({
        value: r.username,
        label: formatHierarchySelectLabel(r.username, r.name),
      })),
      payerCredits,
      addCreditLadders,
      reversibleGrants,
      ...promo,
    }),
  );
}

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
