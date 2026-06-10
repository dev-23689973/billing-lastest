import { describe, expect, it } from "vitest";
import { parseHierarchyRecoverRemark } from "@/lib/hierarchyRecoverRemark";

describe("parseHierarchyRecoverRemark", () => {
  it("parses refunded + promo void split", () => {
    expect(
      parseHierarchyRecoverRemark("5216 credits recovered (5003 refunded, 213 promo void) from dddd"),
    ).toEqual({ walletDebit: 5216, payerRefund: 5003, bonusVoid: 213 });
  });

  it("parses promo-only void recover", () => {
    expect(parseHierarchyRecoverRemark("20 credits recovered (promo void) [recover_of_tx:9] by op")).toEqual({
      walletDebit: 20,
      payerRefund: 0,
      bonusVoid: 20,
    });
  });

  it("parses legacy base recover lines", () => {
    expect(parseHierarchyRecoverRemark("10460 credits recovered (10000 base) [recover_of_tx:2] by mmmm")).toEqual({
      walletDebit: 10460,
      payerRefund: 10000,
      bonusVoid: 460,
    });
  });

  it("parses plain recover without split", () => {
    expect(parseHierarchyRecoverRemark("25000 credits recovered from dealer1")).toEqual({
      walletDebit: 25000,
      payerRefund: 25000,
      bonusVoid: 0,
    });
  });
});
