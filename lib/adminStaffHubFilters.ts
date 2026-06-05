/** Staff hub (`/admin/managers`) role filter — shared by KPI widgets and the filter bar. */

export type StaffRoleFilter = "" | "manager" | "reseller" | "dealer";

export type StaffHubFilterHrefs = {
  all: string;
  manager: string;
  reseller: string;
  dealer: string;
};

export type StaffChartRoleKey = "managers" | "resellers" | "dealers";

export function staffRoleFromChartKey(key: StaffChartRoleKey): Exclude<StaffRoleFilter, ""> {
  if (key === "managers") return "manager";
  if (key === "resellers") return "reseller";
  return "dealer";
}
