import { describe, expect, it } from "vitest";
import {
  aggregateBulkRenewAvailability,
  anyWalletAffordableForBulkOption,
  bestOffWalletAverageCredits,
  filterBulkRenewValidityOptions,
  walletAffordableForBulkOption,
} from "@/lib/bulkRenewPlanning";
import type { ValidityOption } from "@/lib/validityOptions";

const options: ValidityOption[] = [
  { value: "1", label: "1 Month (1 Credit)" },
  { value: "4", label: "4 Months (4 Credits)" },
  { value: "5", label: "5 Months (5 Credits)" },
  { value: "12", label: "12 Months (12 Credits)" },
  { value: "24", label: "24 Months (12 Credits + 12 Bonus Months)" },
];

describe("bestOffWalletAverageCredits", () => {
  it("uses the highest credits-per-account ratio", () => {
    const avg = bestOffWalletAverageCredits([
      { debitUsername: "B", debitCredits: 100, accountCount: 30 },
      { debitUsername: "C", debitCredits: 50, accountCount: 10 },
    ]);
    expect(avg).toBe(5);
  });
});

describe("filterBulkRenewValidityOptions", () => {
  it("shows periods up to the best-off dealer average", () => {
    const filtered = filterBulkRenewValidityOptions(options, [
      { debitUsername: "B", debitCredits: 100, accountCount: 30 },
      { debitUsername: "C", debitCredits: 50, accountCount: 10 },
    ]);

    expect(filtered.some((o) => o.value === "5")).toBe(true);
    expect(filtered.some((o) => o.value === "4")).toBe(true);
    expect(filtered.some((o) => o.value === "12")).toBe(false);
    expect(filtered.some((o) => o.value === "24")).toBe(false);
  });

  it("still lists periods when another wallet has zero credits", () => {
    const filtered = filterBulkRenewValidityOptions(options, [
      { debitUsername: "broke", debitCredits: 0, accountCount: 11 },
      { debitUsername: "C", debitCredits: 50, accountCount: 10 },
    ]);

    expect(filtered.some((o) => o.value === "5")).toBe(true);
  });
});

describe("walletAffordableForBulkOption", () => {
  it("requires all accounts under the wallet to be affordable (all or skip)", () => {
    const four = options.find((o) => o.value === "4")!;
    expect(
      walletAffordableForBulkOption({ debitUsername: "C", debitCredits: 50, accountCount: 10 }, four),
    ).toBe(true);
    expect(
      walletAffordableForBulkOption({ debitUsername: "B", debitCredits: 100, accountCount: 30 }, four),
    ).toBe(false);
    expect(
      walletAffordableForBulkOption({ debitUsername: "A", debitCredits: 5, accountCount: 8 }, options[0]!),
    ).toBe(false);
  });
});

describe("anyWalletAffordableForBulkOption", () => {
  it("is true when at least one wallet can renew all its accounts", () => {
    const four = options.find((o) => o.value === "4")!;
    expect(
      anyWalletAffordableForBulkOption(
        [
          { debitUsername: "B", debitCredits: 100, accountCount: 30 },
          { debitUsername: "C", debitCredits: 50, accountCount: 10 },
        ],
        four,
      ),
    ).toBe(true);
  });
});

describe("aggregateBulkRenewAvailability", () => {
  it("groups selected accounts by debit wallet", () => {
    const snapshot = aggregateBulkRenewAvailability(3, [
      { account: "a1", ok: true, debitUsername: "dealerA", debitCredits: 20 },
      { account: "a2", ok: true, debitUsername: "dealerA", debitCredits: 18 },
      { account: "a3", ok: true, debitUsername: "dealerB", debitCredits: 5 },
    ]);

    expect(snapshot.wallets).toHaveLength(2);
    expect(snapshot.wallets.find((w) => w.debitUsername === "dealerA")?.accountCount).toBe(2);
    expect(snapshot.wallets.find((w) => w.debitUsername === "dealerB")?.accountCount).toBe(1);
  });
});
