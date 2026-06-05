import type { RowDataPacket } from "mysql2/promise";
import { getSession } from "@/lib/session";
import { getBillingPool } from "@/lib/db/pool";
import { canAccessAccountByRole, getUserForInlineEdit, updateAccountWithStalkerSync } from "@/lib/repos/billing";
import { apiJson } from "@/lib/dto/apiJson";

type EditableField = "user" | "password" | "mac" | "status";

function isField(v: string): v is EditableField {
  return v === "user" || v === "password" || v === "mac" || v === "status";
}

function toCanonicalMac(raw: string): string | null {
  const hexOnly = raw.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hexOnly.length !== 12) return null;
  const parts = hexOnly.match(/.{1,2}/g);
  if (!parts || parts.length !== 6) return null;
  return parts.join(":");
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") return apiJson({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { account?: string; field?: string; value?: string } | null;
  if (!body) return apiJson({ error: "bad_request" }, { status: 400 });

  const account = String(body.account ?? "").trim();
  const field = String(body.field ?? "");
  const value = String(body.value ?? "").trim();
  if (!account || !isField(field) || !value) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  const inScope = await canAccessAccountByRole({
    ownerType: "SRSLR",
    ownerUsername: s.username,
    account,
  });
  if (!inScope) return apiJson({ error: "forbidden" }, { status: 403 });

  if (field === "status" && value !== "0" && value !== "1") {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  const macValue = field === "mac" ? toCanonicalMac(value) : null;
  if (field === "mac" && !macValue) {
    return apiJson({ error: "invalid_mac" }, { status: 400 });
  }

  const cur = await getUserForInlineEdit(account);
  if (!cur) return apiJson({ error: "not_found" }, { status: 404 });

  if (field === "mac" && macValue) {
    const pool = getBillingPool();
    const [dupRows] = await pool.execute<RowDataPacket[]>(
      `SELECT account
       FROM accounts
       WHERE UPPER(REPLACE(TRIM(COALESCE(mac, '')), '-', ':')) = :m
         AND account <> :a
       LIMIT 1`,
      { m: macValue, a: account },
    );
    if (dupRows.length) {
      return apiJson({ error: "duplicate_mac" }, { status: 409 });
    }
  }

  const status = field === "status" ? Number(value) : cur.statusCode;
  const ok = await updateAccountWithStalkerSync({
    account,
    full_name: field === "user" ? value : cur.name,
    password: field === "password" ? value : cur.password,
    mac: field === "mac" ? (macValue as string) : cur.mac,
    phone: cur.phone,
    note: cur.comments,
    status,
  });

  if (!ok) return apiJson({ error: "update_failed" }, { status: 500 });

  return apiJson({ ok: true });
}

