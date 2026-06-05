import type { StaffCreateKind } from "@/lib/server/staffCreateCreditPresets";

export function staffCreateCreditErrorCode(
  code: string,
  balance?: number,
  required?: number,
): string {
  if (code === "credits_required") return "credits_required";
  if (code === "insufficient_credits") return "credits_balance";
  if (code === "invalid") return "credits_invalid";
  return "credits_db";
}

export function adminStaffCreateErrorQuery(
  role: StaffCreateKind,
  code: string,
  balance?: number,
  required?: number,
): string {
  const q = new URLSearchParams({ error: staffCreateCreditErrorCode(code), staff_new: role });
  if (balance != null) q.set("bal", String(balance));
  if (required != null) q.set("req", String(required));
  return q.toString();
}

export function managerStaffCreateErrorQuery(
  role: "reseller" | "dealer",
  code: string,
  balance?: number,
  required?: number,
): string {
  const q = new URLSearchParams({ error: staffCreateCreditErrorCode(code), staff_new: role });
  if (balance != null) q.set("bal", String(balance));
  if (required != null) q.set("req", String(required));
  return q.toString();
}

export function resellerStaffCreateErrorQuery(code: string, balance?: number, required?: number): string {
  const q = new URLSearchParams({ error: staffCreateCreditErrorCode(code) });
  if (balance != null) q.set("bal", String(balance));
  if (required != null) q.set("req", String(required));
  return q.toString();
}
