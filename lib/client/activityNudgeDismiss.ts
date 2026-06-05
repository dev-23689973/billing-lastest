const STORAGE_PREFIX = "billing:activity-nudge-dismiss:";

export function activityNudgeDismissStorageKey(username: string, dismissKey: string): string {
  return `${STORAGE_PREFIX}${username.trim().toLowerCase()}:${dismissKey}`;
}

export function isActivityNudgeDismissed(username: string, dismissKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(activityNudgeDismissStorageKey(username, dismissKey)) === "1";
  } catch {
    return false;
  }
}

export function dismissActivityNudge(username: string, dismissKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(activityNudgeDismissStorageKey(username, dismissKey), "1");
  } catch {
    /* ignore quota / private mode */
  }
}
