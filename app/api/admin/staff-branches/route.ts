import { apiJson } from "@/lib/dto/apiJson";
import { listDealersPagedAdmin, listResellersPagedForManager } from "@/lib/repos/staffListPaged";
import { getSession } from "@/lib/session";

type BranchRow = {
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

function normalizeStatus(v: string) {
  const s = String(v ?? "").toUpperCase();
  return s === "A" || s === "ACTIVE" ? "Active" : "Inactive";
}

const BRANCH_PAGE_SIZE = 500;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rowType = (url.searchParams.get("rowType") ?? "").toUpperCase();
  const username = (url.searchParams.get("username") ?? "").trim();
  if (!username || (rowType !== "MANAGER" && rowType !== "RESELLER")) {
    return apiJson({ error: "invalid_request" }, { status: 400 });
  }

  let rows: BranchRow[] = [];
  if (rowType === "MANAGER") {
    const { rows: resellers } = await listResellersPagedForManager({
      managerUsername: username,
      page: 1,
      pageSize: BRANCH_PAGE_SIZE,
    });
    rows = resellers.map((r) => ({
      type: "RESELLER",
      username: r.username,
      name: r.name ?? "",
      parent: username,
      status: normalizeStatus(r.status),
      stateCurrentLogin: "",
      stateLastLogin: "",
      branchCount: Number(r.dealerCount ?? 0),
      activeUsers: Number(r.activeUserCount ?? 0),
      expiredUsers: Number(r.expiredUserCount ?? 0),
      totalUsers: Number(r.userCount ?? 0),
      credits: Number(r.credits ?? 0),
    }));
  } else {
    const { rows: dealers } = await listDealersPagedAdmin({
      resellerUsername: username,
      page: 1,
      pageSize: BRANCH_PAGE_SIZE,
    });
    rows = dealers.map((d) => ({
      type: "DEALER",
      username: d.username,
      name: d.name ?? "",
      parent: d.reseller ?? "—",
      status: normalizeStatus(d.status),
      stateCurrentLogin: d.currentLoginTime ?? "",
      stateLastLogin: d.lastLoginTime ?? "",
      branchCount: 0,
      activeUsers: Number(d.activeUserCount ?? 0),
      expiredUsers: Number(d.expiredUserCount ?? 0),
      totalUsers: Number(d.userCount ?? 0),
      credits: Number(d.credits ?? 0),
    }));
  }

  return apiJson({
    title: rowType === "MANAGER" ? "Resellers" : "Dealers",
    subtitle: username,
    rows,
  });
}
