/** Reseller/manager/dealer pickers: `login — Display name` (matches Add user modal). */
export function formatHierarchySelectLabel(username: string, name?: string | null): string {
  const u = username.trim();
  const n = (name ?? "").trim();
  return n && n !== u ? `${u} — ${n}` : u;
}
