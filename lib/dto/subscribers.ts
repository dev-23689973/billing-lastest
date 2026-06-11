import type { AccountListRow } from "@/lib/repos/billing";

/** Subscriber list row safe to serialize to client components / list APIs. */
export type SubscriberListClientRow = Omit<AccountListRow, "password">;

export function toSubscriberListClientRow(row: AccountListRow): SubscriberListClientRow {
  const { password: _password, ...rest } = row;
  return rest;
}

export function toSubscriberListClientRows(rows: AccountListRow[]): SubscriberListClientRow[] {
  return rows.map(toSubscriberListClientRow);
}

/** End-user edit page / modal — password and parent PIN never sent to client. */
export function toEndUserEditClientDto<T extends { password?: string; parentPin?: string }>(
  user: T,
): Omit<T, "password" | "parentPin"> {
  const { password: _password, parentPin: _parentPin, ...rest } = user;
  return rest;
}

export type EndUserEditClientDto = Omit<
  NonNullable<Awaited<ReturnType<typeof import("@/lib/repos/billing").getUserForEdit>>>,
  "password" | "parentPin"
>;
