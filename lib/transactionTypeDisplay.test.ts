import { describe, expect, it } from "vitest";
import { getTransactionTypeLabel, normalizeTransactionType } from "@/lib/transactionTypeDisplay";

describe("transactionTypeDisplay", () => {
  it("normalizes legacy BUY/CREDIT aliases to DB types", () => {
    expect(normalizeTransactionType("buy")).toBe("DBIT");
    expect(normalizeTransactionType("CREDIT")).toBe("CRDT");
    expect(normalizeTransactionType("DBIT")).toBe("DBIT");
  });

  it("labels use operator-facing names", () => {
    expect(getTransactionTypeLabel("BUY")).toBe("Debit");
    expect(getTransactionTypeLabel("crdt")).toBe("Credit");
    expect(getTransactionTypeLabel("BONUS")).toBe("Bonus");
    expect(getTransactionTypeLabel("SUBDBIT")).toBe("Sub debit");
    expect(getTransactionTypeLabel("SUBCRDT")).toBe("Sub credit");
  });
});
