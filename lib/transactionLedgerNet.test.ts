import { describe, expect, it } from "vitest";
import { netLedgerPeriodsForRows } from "@/lib/transactionLedgerNet";

describe("netLedgerPeriodsForRows", () => {
  it("subscriberRaw: debits add, wallet credits subtract", () => {
    const rows = [
      { type: "DBIT", periods: 12 },
      { type: "BONUS", periods: 0 },
      { type: "DBIT", periods: 5 },
    ];
    expect(netLedgerPeriodsForRows(rows, "subscriberRaw")).toBe(17);
  });

  it("walletSigned: sums displayed signed periods (staff modal)", () => {
    const rows = [
      { type: "DBIT", periods: -248 },
      { type: "CRDT", periods: 100 },
      { type: "DBIT", periods: -300 },
      { type: "CRDT", periods: 2000 },
    ];
    expect(netLedgerPeriodsForRows(rows, "subscriberRaw")).toBe(-2648);
    expect(netLedgerPeriodsForRows(rows, "walletSigned")).toBe(1552);
  });

  it("walletSigned: balanced recover/grants net to zero", () => {
    const rows = [
      { type: "DBIT", periods: -248 },
      { type: "CRDT", periods: 100 },
      { type: "CRDT", periods: 2000 },
      { type: "DBIT", periods: -100 },
      { type: "DBIT", periods: -300 },
      { type: "DBIT", periods: -300 },
      { type: "DBIT", periods: -300 },
      { type: "DBIT", periods: -200 },
      { type: "DBIT", periods: -300 },
      { type: "DBIT", periods: -300 },
      { type: "DBIT", periods: -42 },
      { type: "DBIT", periods: -10 },
    ];
    expect(netLedgerPeriodsForRows(rows, "walletSigned")).toBe(0);
  });
});
