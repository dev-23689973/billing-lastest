/** Portal / API scope helpers — safe for client and server (no DB). */

export type EndUserModalScope = "admin" | "manager" | "reseller" | "dealer";

export type StaffEditorPortal = "admin" | "manager" | "reseller";

export type StaffTransactionsScope = "admin" | "manager" | "reseller";

export type StaffBranchesPortal = "admin" | "manager";

export function apiBaseToModalScope(apiBase: string): EndUserModalScope {
  if (apiBase === "/api/manager") return "manager";
  if (apiBase === "/api/reseller") return "reseller";
  if (apiBase === "/api/dealer") return "dealer";
  return "admin";
}

export function editorApiBaseToPortal(editorApiBase: string): StaffEditorPortal {
  if (editorApiBase === "/api/manager") return "manager";
  if (editorApiBase === "/api/reseller") return "reseller";
  return "admin";
}

export function staffTransactionsApiBaseToScope(apiBase: string): StaffTransactionsScope {
  if (apiBase === "/api/manager") return "manager";
  if (apiBase === "/api/reseller") return "reseller";
  return "admin";
}

export function staffBranchesApiBaseToPortal(apiBase: string): StaffBranchesPortal {
  return apiBase === "/api/manager" ? "manager" : "admin";
}
