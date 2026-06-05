/** Client-side sort for one page when SQL sort is unavailable (credits, counts, state). */

export type BranchModalRow = {
  type: "RESELLER" | "DEALER";
  username: string;
  name: string;
  parent: string;
  status: string;
  stateCurrentLogin: string;
  stateLastLogin: string;
  branchCount: number;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  credits: number;
};

export type BranchModalSortKey =
  | "name"
  | "username"
  | "credits"
  | "branchCount"
  | "parent"
  | "status"
  | "state"
  | "type"
  | "activeUsers"
  | "expiredUsers"
  | "totalUsers";

export const BRANCH_MODAL_SERVER_SORT_KEYS = new Set<BranchModalSortKey>(["name", "username", "status", "parent"]);

function parseDate(raw: string): number {
  const s = String(raw ?? "").trim();
  if (!s || s === "—" || s.startsWith("0000-00-00")) return 0;
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
  return Number.isNaN(t) ? 0 : t;
}

export function sortBranchModalPageRows(
  rows: BranchModalRow[],
  sortKey: BranchModalSortKey,
  sortDir: "asc" | "desc",
): BranchModalRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const txt = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  const num = (a: number, b: number) => a - b;

  const out = [...rows];
  out.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = txt(a.name || "", b.name || "");
        break;
      case "username":
        cmp = txt(a.username, b.username);
        break;
      case "credits":
        cmp = num(a.credits, b.credits);
        break;
      case "branchCount":
        cmp = num(a.branchCount, b.branchCount);
        break;
      case "parent":
        cmp = txt(a.parent || "", b.parent || "");
        break;
      case "status":
        cmp = txt(a.status, b.status);
        break;
      case "state":
        cmp = num(
          Math.max(parseDate(a.stateCurrentLogin), parseDate(a.stateLastLogin)),
          Math.max(parseDate(b.stateCurrentLogin), parseDate(b.stateLastLogin)),
        );
        break;
      case "type":
        cmp = txt(a.type, b.type);
        break;
      case "activeUsers":
        cmp = num(a.activeUsers, b.activeUsers);
        break;
      case "expiredUsers":
        cmp = num(a.expiredUsers, b.expiredUsers);
        break;
      case "totalUsers":
        cmp = num(a.totalUsers, b.totalUsers);
        break;
    }
    if (cmp !== 0) return cmp * dir;
    return txt(a.username, b.username);
  });
  return out;
}
