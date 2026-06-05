import { describe, expect, it } from "vitest";
import {
  STAFF_MODAL_TABLE_COLUMNS,
  SUBSCRIBER_MODAL_TABLE_COLUMNS,
  transactionModalColumnHeader,
  transactionModalTableColumns,
} from "@/lib/ui/transactionModalTableColumns";

describe("transactionModalTableColumns", () => {
  it("staff preset omits months and uses wallet-oriented headers", () => {
    expect(transactionModalTableColumns("staff")).toEqual(STAFF_MODAL_TABLE_COLUMNS);
    expect(STAFF_MODAL_TABLE_COLUMNS).not.toContain("months");
    expect(transactionModalColumnHeader("staff", "account").full).toBe("To / from");
    expect(transactionModalColumnHeader("staff", "credits").full).toBe("Amount");
  });

  it("subscriber preset keeps months and sub-account label", () => {
    expect(transactionModalTableColumns("subscriber")).toEqual(SUBSCRIBER_MODAL_TABLE_COLUMNS);
    expect(SUBSCRIBER_MODAL_TABLE_COLUMNS).toContain("months");
    expect(transactionModalColumnHeader("subscriber", "account").full).toBe("Sub-account");
  });
});
