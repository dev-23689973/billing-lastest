import { describe, expect, it } from "vitest";
import {
  isSubscriberCreditType,
  isSubscriberDebitType,
  SUBSCRIBER_TX_CREDIT,
  SUBSCRIBER_TX_DEBIT,
} from "@/lib/billing/subscriberTransactionTypes";
import { isWalletCreditType } from "@/lib/billing/transactionWalletSql";

describe("subscriberTransactionTypes", () => {
  it("recognizes new subscriber ledger types", () => {
    expect(isSubscriberDebitType(SUBSCRIBER_TX_DEBIT)).toBe(true);
    expect(isSubscriberCreditType(SUBSCRIBER_TX_CREDIT)).toBe(true);
    expect(isWalletCreditType(SUBSCRIBER_TX_CREDIT)).toBe(true);
    expect(isWalletCreditType(SUBSCRIBER_TX_DEBIT)).toBe(false);
  });

  it("still treats legacy DBIT subscriber rows as debits", () => {
    expect(isSubscriberDebitType("DBIT")).toBe(true);
  });
});
