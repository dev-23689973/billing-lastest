import { revalidatePath } from "next/cache";
import { apiJson } from "@/lib/dto/apiJson";
import { toStaffEditorClientDto } from "@/lib/dto/staff";
import { getDealerById, getManagerById, getResellerById, getSettings, listManagersForSelect, listResellersForSelect } from "@/lib/data";
import {
  HIERARCHY_ADD_CREDITS_MAX,
  parseHierarchyAddCreditApplyPromo,
  parseRecoverGrantTxIds,
} from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import { getSession } from "@/lib/session";
import { formatHierarchySelectLabel } from "@/lib/formatHierarchySelectLabel";

type StaffEditorSection = "profile" | "credits" | "all";

function parseStaffEditorSection(raw: string | null): StaffEditorSection {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "profile" || v === "credits") return v;
  return "all";
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "").toUpperCase();
  const username = (url.searchParams.get("username") ?? "").trim();
  const section = parseStaffEditorSection(url.searchParams.get("section"));
  const includeProfile = section === "all" || section === "profile";
  const includeCredits = section === "all" || section === "credits";

  if (!username || (type !== "MANAGER" && type !== "RESELLER" && type !== "DEALER")) {
    return apiJson({ error: "invalid_request" }, { status: 400 });
  }

  const settings = includeCredits || includeProfile ? await getSettings().catch(() => null) : null;
  const hierarchyAddMaxRaw = settings?.hierarchyAddCreditMax ?? String(HIERARCHY_ADD_CREDITS_MAX);
  const hierarchyAddMax = Math.min(
    HIERARCHY_ADD_CREDITS_MAX,
    Math.max(1, Number.parseInt(String(hierarchyAddMaxRaw).trim(), 10) || HIERARCHY_ADD_CREDITS_MAX),
  );
  const managerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_manager", settings) : 1;
  const resellerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_reseller", settings) : 1;
  const dealerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_dealer", settings) : 1;

  if (type === "MANAGER") {
    const row = await getManagerById(username);
    if (!row) return apiJson({ error: "not_found" }, { status: 404 });
    const promo = includeCredits ? await promoPreviewPayload("MANAGER", row.username) : {};
    const addCreditLadders =
      includeCredits && settings != null
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "admin_manager",
            targetUsername: row.username,
            payerUsername: session.username,
            settings,
          })
        : undefined;
    const reversibleGrants = includeCredits ? await repo.listReversibleHierarchyGrants(row.username) : undefined;
    return apiJson(
      toStaffEditorClientDto({
        ...(includeProfile
          ? {
              type,
              username: row.username,
              name: row.name ?? "",
              password: row.password ?? "",
              status: row.status ?? "A",
              comments: row.comments ?? "",
              credits: Number(row.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: managerAddMin,
              payerCredits: null,
              tickets_manager: row.ticketsManager === "Yes" ? "Yes" : "No",
            }
          : {}),
        ...(includeCredits
          ? {
              type,
              username: row.username,
              credits: Number(row.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: managerAddMin,
              payerCredits: null,
              addCreditLadders: addCreditLadders ?? { promoRungs: [], additionalRungs: [] },
              reversibleGrants: reversibleGrants ?? [],
              ...promo,
            }
          : {}),
      }),
    );
  }

  if (type === "RESELLER") {
    const row = await getResellerById(username);
    if (!row) return apiJson({ error: "not_found" }, { status: 404 });
    const managers = includeProfile ? await listManagersForSelect() : [];
    const promo = includeCredits ? await promoPreviewPayload("RESELLER", row.username) : {};
    const payer = (row.manager ?? "").trim();
    const payerCredits = payer && (includeProfile || includeCredits) ? await repo.getCreditBalance(payer) : payer ? 0 : 0;
    const addCreditLadders =
      includeCredits && settings != null && payer
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "admin_reseller",
            targetUsername: row.username,
            payerUsername: payer,
            settings,
          })
        : undefined;
    const reversibleGrants = includeCredits ? await repo.listReversibleHierarchyGrants(row.username) : undefined;
    return apiJson(
      toStaffEditorClientDto({
        ...(includeProfile
          ? {
              type,
              username: row.username,
              name: row.name ?? "",
              password: row.password ?? "",
              status: row.status ?? "ACTIVE",
              comments: row.comments ?? "",
              credits: Number(row.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: resellerAddMin,
              manager: row.manager ?? "",
              managerOptions: managers.map((m) => ({ value: m.username, label: formatHierarchySelectLabel(m.username, m.name) })),
              payerCredits,
              tickets_manager: row.ticketsManager === "Yes" ? "Yes" : "No",
            }
          : {}),
        ...(includeCredits
          ? {
              type,
              username: row.username,
              credits: Number(row.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: resellerAddMin,
              payerCredits,
              addCreditLadders: addCreditLadders ?? { promoRungs: [], additionalRungs: [] },
              reversibleGrants: reversibleGrants ?? [],
              ...promo,
            }
          : {}),
      }),
    );
  }

  const row = await getDealerById(username);
  if (!row) return apiJson({ error: "not_found" }, { status: 404 });
  const resellers = includeProfile ? await listResellersForSelect() : [];
  const promo = includeCredits ? await promoPreviewPayload("DEALER", row.username) : {};
  const payer = (row.reseller ?? "").trim();
  const payerCredits = payer && (includeProfile || includeCredits) ? await repo.getCreditBalance(payer) : 0;
  const addCreditLadders =
    includeCredits && settings != null && payer
      ? await repo.buildHierarchyAddCreditRungs({
          portal: "admin_dealer",
          targetUsername: row.username,
          payerUsername: payer,
          settings,
        })
      : undefined;
  const reversibleGrants = includeCredits ? await repo.listReversibleHierarchyGrants(row.username) : undefined;
  return apiJson(
    toStaffEditorClientDto({
      ...(includeProfile
        ? {
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
            resellerOptions: resellers.map((r) => ({ value: r.username, label: formatHierarchySelectLabel(r.username, r.name) })),
            payerCredits,
          }
        : {}),
      ...(includeCredits
        ? {
            type,
            username: row.username,
            credits: Number(row.credits ?? 0),
            hierarchyAddMax,
            hierarchyAddMin: dealerAddMin,
            payerCredits,
            addCreditLadders: addCreditLadders ?? { promoRungs: [], additionalRungs: [] },
            reversibleGrants: reversibleGrants ?? [],
            ...promo,
          }
        : {}),
    }),
  );
}

async function promoPreviewPayload(type: "MANAGER" | "RESELLER" | "DEALER", username: string) {
  const rules = await repo.getPromoBonusRules();
  const kind = type === "MANAGER" ? "MNGR" : type === "RESELLER" ? "SRSLR" : "RSLR";
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
