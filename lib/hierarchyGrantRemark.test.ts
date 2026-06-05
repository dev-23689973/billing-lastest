import { describe, expect, it } from "vitest";
import {
  isHierarchyGrantRemarks,
  parseHierarchyGrantBaseCredits,
  resolveHierarchyGrantAmounts,
  resolveLooseWalletCrdtAmounts,
} from "./hierarchyGrantRemark";

describe("parseHierarchyGrantBaseCredits", () => {
  it("parses base from unified grant remark", () => {
    expect(parseHierarchyGrantBaseCredits("115 credits received by admin (base 100)")).toBe(100);
  });

  it("does not treat (base 1000) as (base 100)", () => {
    expect(parseHierarchyGrantBaseCredits("1100 credits received by x (base 1000)")).toBe(1000);
    expect(parseHierarchyGrantBaseCredits("150 credits received by x (base 100)")).toBe(100);
  });

  it("returns null when marker missing", () => {
    expect(parseHierarchyGrantBaseCredits("100 credits received by admin")).toBeNull();
  });
});

describe("isHierarchyGrantRemarks", () => {
  it("accepts legacy PHP HTML transfer lines without (base)", () => {
    expect(
      isHierarchyGrantRemarks("Credit <strong>From</strong>: admin <strong>To</strong>: coach", null),
    ).toBe(true);
  });

  it("rejects subscriber renewal CRDT with account set", () => {
    expect(isHierarchyGrantRemarks("Account 12345 renewed", "12345")).toBe(false);
  });

  it("accepts legacy beneficiary CRDT when account column was set", () => {
    expect(
      isHierarchyGrantRemarks("515 credits received by admin (base 500) [grant_meta:p1=10|p2=5]", "admin"),
    ).toBe(true);
  });
});

describe("resolveHierarchyGrantAmounts", () => {
  it("uses (base) when present", () => {
    expect(resolveHierarchyGrantAmounts("115 credits received by admin (base 100)", 115, null)).toEqual({
      base: 100,
      total: 115,
    });
  });

  it("infers base from leading amount on legacy plain remarks", () => {
    expect(resolveHierarchyGrantAmounts("100 credits received by admin", 100, null)).toEqual({
      base: 100,
      total: 100,
    });
  });

  it("uses periods for PHP Credit From/To lines", () => {
    expect(
      resolveHierarchyGrantAmounts("Credit <strong>From</strong>: admin <strong>To</strong>: express", 999000, null),
    ).toEqual({ base: 999000, total: 999000 });
  });
});

describe("resolveLooseWalletCrdtAmounts", () => {
  it("accepts legacy received N credits wording", () => {
    expect(resolveLooseWalletCrdtAmounts("received 276 credits from admin", 276, null)).toEqual({
      base: 276,
      total: 276,
    });
  });

  it("rejects subscriber renewal CRDT", () => {
    expect(resolveLooseWalletCrdtAmounts("Account 12345 renewed", 12, "12345")).toBeNull();
  });
});
