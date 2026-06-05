import type { TransactionColumnKey } from "@/components/admin/transactionsTableFormatters";

export type TransactionModalColumnPreset = "staff" | "subscriber";

/** Staff wallet history: transfers to end users and owned staff — no subscription months column. */
export const STAFF_MODAL_TABLE_COLUMNS: readonly TransactionColumnKey[] = [
  "type",
  "credits",
  "account",
  "remarks",
  "timestamp",
];

/** End-user account history in subscribers modal. */
export const SUBSCRIBER_MODAL_TABLE_COLUMNS: readonly TransactionColumnKey[] = [
  "type",
  "credits",
  "months",
  "account",
  "remarks",
  "timestamp",
];

export function transactionModalTableColumns(
  preset: TransactionModalColumnPreset,
): readonly TransactionColumnKey[] {
  return preset === "staff" ? STAFF_MODAL_TABLE_COLUMNS : SUBSCRIBER_MODAL_TABLE_COLUMNS;
}

export type ModalColumnHeaderLabel = { short: string; full: string };

const DEFAULT_MODAL_HEADERS: Record<TransactionColumnKey, ModalColumnHeaderLabel> = {
  type: { short: "Type", full: "Type" },
  credits: { short: "Cr", full: "Credits" },
  months: { short: "Mo", full: "Months" },
  account: { short: "Acct", full: "Sub-account" },
  coverageStart: { short: "CovS", full: "Coverage start" },
  coverageEnd: { short: "CovE", full: "Coverage end" },
  remarks: { short: "Note", full: "Remarks" },
  timestamp: { short: "Date", full: "Date / time" },
};

const PRESET_HEADER_OVERRIDES: Record<
  TransactionModalColumnPreset,
  Partial<Record<TransactionColumnKey, ModalColumnHeaderLabel>>
> = {
  staff: {
    credits: { short: "Amt", full: "Amount" },
    account: { short: "Party", full: "To / from" },
  },
  subscriber: {},
};

export function transactionModalColumnHeader(
  preset: TransactionModalColumnPreset,
  key: TransactionColumnKey,
): ModalColumnHeaderLabel {
  return PRESET_HEADER_OVERRIDES[preset][key] ?? DEFAULT_MODAL_HEADERS[key];
}
