/** Manager portal inline status toggle values (`A` active / `S` suspended). */
export function staffInlineStatusValue(status: string): "A" | "S" {
  const u = String(status ?? "").trim().toUpperCase();
  if (u === "A" || u === "ACTIVE") return "A";
  return "S";
}
