import type { SubscriberListClientRow } from "@/lib/dto/subscribers";

/** Fixed users-list column keys (11 data columns + selection + actions). */
export type SubscribersUserColumnKey =
  | "account"
  | "name"
  | "username"
  | "mac"
  | "parents"
  | "status"
  | "state"
  | "created"
  | "expiry"
  | "autoRenew";

export const SUBSCRIBERS_USER_TABLE_COLUMNS: { key: SubscribersUserColumnKey; label: string }[] = [
  { key: "account", label: "User ID" },
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "mac", label: "MAC ID" },
  { key: "parents", label: "Parents" },
  { key: "status", label: "Status" },
  { key: "state", label: "State" },
  { key: "created", label: "Create date" },
  { key: "expiry", label: "Expiry date" },
  { key: "autoRenew", label: "Auto renewal" },
];

export const SUBSCRIBERS_USER_COLUMN_ORDER: readonly SubscribersUserColumnKey[] =
  SUBSCRIBERS_USER_TABLE_COLUMNS.map((c) => c.key);

export const SUBSCRIBERS_USER_COLUMN_LABELS: Record<SubscribersUserColumnKey, string> = Object.fromEntries(
  SUBSCRIBERS_USER_TABLE_COLUMNS.map((c) => [c.key, c.label]),
) as Record<SubscribersUserColumnKey, string>;

export const SUBSCRIBERS_USER_COLUMN_SHORT_LABELS: Record<SubscribersUserColumnKey, string> = {
  account: "ID",
  name: "Name",
  username: "User",
  mac: "MAC",
  parents: "Owner",
  status: "St",
  state: "State",
  created: "Created",
  expiry: "Expiry",
  autoRenew: "Renew",
};

export const SUBSCRIBERS_USER_COLUMN_LAYOUT_WEIGHT: Record<SubscribersUserColumnKey, number> = {
  account: 8,
  name: 10,
  username: 8,
  mac: 11,
  parents: 9,
  status: 6,
  state: 14,
  created: 8,
  expiry: 8,
  autoRenew: 10,
};

export function subscribersUserTableColumnIds(
  visibleColumns: ReadonlySet<SubscribersUserColumnKey>,
  showUserIdColumn: boolean,
): SubscribersUserColumnKey[] {
  return SUBSCRIBERS_USER_COLUMN_ORDER.filter((key) => {
    if (key === "account" && !showUserIdColumn) return false;
    return visibleColumns.has(key);
  });
}

export function subscribersUserConfigurableColumns(showUserIdColumn: boolean) {
  return SUBSCRIBERS_USER_TABLE_COLUMNS.filter((c) => showUserIdColumn || c.key !== "account");
}

export type SubscriberOwnerRef = {
  login: string;
  role: "dealer" | "reseller" | "manager";
};

/** Billing owner for the account (dealer → reseller → manager → accounts.username). */
export function subscriberBillingOwner(row: SubscriberListClientRow): SubscriberOwnerRef | null {
  const dealer = row.dealer?.trim();
  if (dealer) return { login: dealer, role: "dealer" };
  const reseller = row.reseller?.trim();
  if (reseller) return { login: reseller, role: "reseller" };
  const manager = row.manager?.trim();
  if (manager) return { login: manager, role: "manager" };
  const owner = row.username?.trim();
  if (owner) return { login: owner, role: "dealer" };
  return null;
}

export function formatSubscriberCreated(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = String(raw).trim();
  if (!s || s.startsWith("0000-00-00")) return "—";
  return s.slice(0, 10);
}
