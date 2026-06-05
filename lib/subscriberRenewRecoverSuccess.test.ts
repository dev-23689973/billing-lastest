import { describe, expect, it } from "vitest";
import {
  buildSubscriberRecoverSuccessDetails,
  buildSubscriberRenewSuccessDetails,
} from "@/lib/subscriberRenewRecoverSuccess";

describe("buildSubscriberRenewSuccessDetails", () => {
  it("computes wallet debit and promo bonus from validity option", () => {
    const details = buildSubscriberRenewSuccessDetails({
      account: "user1",
      displayName: "Test User",
      debitUsername: "dealer1",
      walletBefore: 50,
      selectedOption: { value: "12", label: "12 months (10 credits + 2 Bonus Months)" },
      expiryBefore: new Date("2026-06-01"),
      expiryAfter: new Date("2027-06-01"),
    });

    expect(details.mode).toBe("renew");
    expect(details.walletAfter).toBe(40);
    expect(details.chargedCredits).toBe(10);
    expect(details.promoBonusMonths).toBe(2);
  });
});

describe("buildSubscriberRecoverSuccessDetails", () => {
  it("refunds credit months to wallet and records bonus months", () => {
    const details = buildSubscriberRecoverSuccessDetails({
      account: "user1",
      walletBefore: 21,
      creditMonths: 3,
      bonusMonths: 1,
      expiryBefore: new Date("2027-06-01"),
      expiryAfter: new Date("2027-02-01"),
    });

    expect(details.mode).toBe("recover");
    expect(details.walletAfter).toBe(24);
    expect(details.creditMonthsRecovered).toBe(3);
    expect(details.bonusMonthsRecovered).toBe(1);
    expect(details.chargedCredits).toBe(3);
  });
});
