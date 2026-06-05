import type { RowDataPacket } from "mysql2";
import { getStalkerPool } from "@/lib/db/pool";

/** Tariff plan name + subscriber count (dashboard “Package distribution” panel). */
export type AdminReportPackageRow = { name: string; count: number };

async function loadPackageDistribution(): Promise<AdminReportPackageRow[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  try {
    const [rows] = await stalker.execute<RowDataPacket[]>(
      `SELECT x.nm AS plan_name, COUNT(*) AS c
       FROM (
         SELECT COALESCE(NULLIF(TRIM(tp.name), ''), CONCAT('Plan #', u.tariff_plan_id)) AS nm
         FROM users u
         LEFT JOIN tariff_plan tp ON tp.id = u.tariff_plan_id
       ) x
       GROUP BY x.nm
       ORDER BY c DESC
       LIMIT 10`,
    );
    return rows.map((r) => ({
      name: String(r.plan_name ?? "Unknown"),
      count: Math.floor(Number(r.c ?? 0)),
    }));
  } catch {
    return [];
  }
}

export async function getAdminPackageDistribution(): Promise<AdminReportPackageRow[]> {
  return loadPackageDistribution();
}
