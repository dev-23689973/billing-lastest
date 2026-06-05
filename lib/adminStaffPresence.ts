export type StaffPresenceState = "ONLINE" | "IDLE" | "OFFLINE";

export type StaffPresenceStyle = {
  state: StaffPresenceState;
  badgeClass: string;
  relativeClass: string;
};

export function deriveStaffPresenceFromCurrentLogin(current: Date | null): StaffPresenceStyle {
  if (!current) {
    return {
      state: "OFFLINE",
      badgeClass:
        "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/12 dark:text-slate-200",
      relativeClass: "text-slate-600 dark:text-slate-300",
    };
  }
  const ageMs = Math.max(0, Date.now() - current.getTime());
  if (ageMs <= 5 * 60 * 1000) {
    return {
      state: "ONLINE",
      badgeClass:
        "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200",
      relativeClass: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (ageMs <= 24 * 60 * 60 * 1000) {
    return {
      state: "IDLE",
      badgeClass:
        "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-200",
      relativeClass: "text-amber-700 dark:text-amber-300",
    };
  }
  return {
    state: "OFFLINE",
    badgeClass:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/12 dark:text-slate-200",
    relativeClass: "text-slate-600 dark:text-slate-300",
  };
}

export function deriveStaffPresenceFromLoginRaw(currentRaw: string, parseDate: (raw: string) => Date | null): StaffPresenceStyle {
  return deriveStaffPresenceFromCurrentLogin(parseDate(currentRaw));
}

/** Live panel presence (Pusher) — in UI or not; no idle tier. */
export function deriveStaffPresenceFromRealtime(isOnlineInPanel: boolean): StaffPresenceStyle {
  if (isOnlineInPanel) {
    return {
      state: "ONLINE",
      badgeClass:
        "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200",
      relativeClass: "text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    state: "OFFLINE",
    badgeClass:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/12 dark:text-slate-200",
    relativeClass: "text-slate-600 dark:text-slate-300",
  };
}

export function normalizeStaffUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isUsernameOnlineInPanel(
  username: string,
  onlineUsernames: ReadonlySet<string> | readonly { username: string }[],
): boolean {
  const key = normalizeStaffUsername(username);
  if (!key) return false;
  if (Array.isArray(onlineUsernames)) {
    return onlineUsernames.some((m) => normalizeStaffUsername(m.username) === key);
  }
  return (onlineUsernames as ReadonlySet<string>).has(key);
}
