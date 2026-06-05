import { normalizeStaffUsername } from "@/lib/adminStaffPresence";

/** Client-safe — builds a lowercase username set for branch presence tooltips. */
export function normalizeBranchPeerSet(usernames: string[] | null | undefined): Set<string> | null {
  if (usernames === null) return null;
  const set = new Set<string>();
  for (const u of usernames ?? []) {
    const key = normalizeStaffUsername(u);
    if (key) set.add(key);
  }
  return set;
}
