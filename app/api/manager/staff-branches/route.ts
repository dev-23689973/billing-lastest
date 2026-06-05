import { apiJson } from "@/lib/dto/apiJson";
import { listDealersPagedForManager } from "@/lib/repos/staffListPaged";
import { managerOwnsReseller } from "@/lib/repos/managerPortal";
import { getSession } from "@/lib/session";

function normalizeStatus(v: string) {
  const s = String(v ?? "").toUpperCase();
  return s === "A" || s === "ACTIVE" ? "Active" : "Inactive";
}

const BRANCH_PAGE_SIZE = 500;

/** Manager portal — dealers under an owned reseller (PHP manager reseller → dealers drill-down). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "MNGR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const mgr = session.username.trim();
  const url = new URL(req.url);
  const rowType = (url.searchParams.get("rowType") ?? "").toUpperCase();
  const username = (url.searchParams.get("username") ?? "").trim();
  if (!username || rowType !== "RESELLER") {
    return apiJson({ error: "invalid_request" }, { status: 400 });
  }

  if (!(await managerOwnsReseller(mgr, username))) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const { rows: dealers } = await listDealersPagedForManager({
    managerUsername: mgr,
    resellerUsername: username,
    page: 1,
    pageSize: BRANCH_PAGE_SIZE,
  });

  const rows = dealers.map((d) => ({
    type: "DEALER" as const,
    username: d.username,
    name: d.name ?? "",
    parent: d.resellerUsername ?? "—",
    status: normalizeStatus(d.status),
    stateCurrentLogin: d.currentLoginTime ?? "",
    stateLastLogin: d.lastLoginTime ?? "",
    branchCount: 0,
    activeUsers: Number(d.activeUserCount ?? 0),
    expiredUsers: Number(d.expiredUserCount ?? 0),
    totalUsers: Number(d.userCount ?? 0),
    credits: Number(d.credits ?? 0),
  }));

  return apiJson({
    title: "Dealers",
    subtitle: username,
    rows,
  });
}
