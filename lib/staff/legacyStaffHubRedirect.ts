const FORWARD_KEYS = ["ok", "error", "bal", "req", "credit", "credit_modal", "credit_user"] as const;

/** Build redirect URL to a unified staff hub after legacy full-page routes were removed. */
export function buildStaffHubRedirectUrl(
  hubPath: string,
  username: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const q = new URLSearchParams();

  for (const key of FORWARD_KEYS) {
    const raw = searchParams[key];
    if (typeof raw === "string" && raw.trim()) q.set(key, raw.trim());
  }

  if (username && !q.has("credit_user")) {
    q.set("credit_user", username);
  }

  const query = q.toString();
  return query ? `${hubPath}?${query}` : hubPath;
}

/** Server-action redirects to a staff hub with optional query updates. */
export function staffHubPath(
  hubPath: string,
  username: string,
  updates: Record<string, string> = {},
): string {
  const q = new URLSearchParams();
  if (username.trim()) q.set("credit_user", username.trim());
  for (const [key, value] of Object.entries(updates)) {
    if (value !== "") q.set(key, value);
  }
  const query = q.toString();
  return query ? `${hubPath}?${query}` : hubPath;
}
