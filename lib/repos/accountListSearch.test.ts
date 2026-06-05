import { describe, expect, it } from "vitest";
import {
  ACCOUNT_LIST_DISPLAYED_PARENT_SQL,
  accountListSearchWhereClause,
  isMacLikeSearch,
  macSearchLikePatterns,
} from "@/lib/repos/accountListSearch";

describe("isMacLikeSearch", () => {
  it("accepts valid and partial MAC shapes", () => {
    expect(isMacLikeSearch("00:1A:79:F9:E8:D7")).toBe(true);
    expect(isMacLikeSearch("00-1a-79-aa-bb-cc")).toBe(true);
    expect(isMacLikeSearch("00:1A:79")).toBe(true);
    expect(isMacLikeSearch("001a79f9e8d7")).toBe(true);
  });

  it("rejects plain numeric account-style ids", () => {
    expect(isMacLikeSearch("228742")).toBe(false);
    expect(isMacLikeSearch("john")).toBe(false);
  });
});

describe("macSearchLikePatterns", () => {
  it("includes colon, hyphen, and compact hex variants", () => {
    const patterns = macSearchLikePatterns("00:1A:79:F9:E8:D7");
    expect(patterns).toContain("%00:1A:79:F9:E8:D7%");
    expect(patterns).toContain("%00-1A-79-F9-E8-D7%");
    expect(patterns).toContain("%001A79F9E8D7%");
  });
});

describe("accountListSearchWhereClause", () => {
  it("returns empty for blank search", () => {
    expect(accountListSearchWhereClause("")).toEqual({ sql: "", params: [] });
    expect(accountListSearchWhereClause("   ")).toEqual({ sql: "", params: [] });
  });

  it("uses LIKE on table-visible fields for short queries", () => {
    const { sql, params } = accountListSearchWhereClause("ab");
    expect(sql).toContain("a.full_name LIKE ?");
    expect(sql).toContain("a.account LIKE ?");
    expect(sql).toContain("a.mac LIKE ?");
    expect(sql).toContain(ACCOUNT_LIST_DISPLAYED_PARENT_SQL);
    expect(sql).not.toContain("a.phone");
    expect(sql).not.toContain("a.username LIKE");
    expect(sql).not.toContain("AGAINST");
    expect(params).toHaveLength(4);
  });

  it("uses MAC LIKE on mac and account for MAC-shaped queries", () => {
    const { sql, params } = accountListSearchWhereClause("00:1A:79:F9:E8:D7");
    expect(sql).toContain("a.mac LIKE ?");
    expect(sql).toContain("a.account LIKE ?");
    expect(sql).not.toContain("AGAINST");
    expect(sql).not.toContain("a.phone");
    expect(sql).not.toContain("IFNULL(ur1.username, '') LIKE");
    expect(params.length).toBeGreaterThan(4);
  });

  it("uses LIKE on table-visible fields for longer text (no FULLTEXT — index column list)", () => {
    const { sql, params } = accountListSearchWhereClause("john tv");
    expect(sql).toContain("a.full_name LIKE ?");
    expect(sql).toContain("a.account LIKE ?");
    expect(sql).not.toContain("AGAINST");
    expect(sql).not.toContain("a.phone");
    expect(sql).toContain(ACCOUNT_LIST_DISPLAYED_PARENT_SQL);
    expect(params).toHaveLength(4);
  });

  it("does not search hidden dealer username when parent shows reseller", () => {
    const { sql } = accountListSearchWhereClause("breadford");
    expect(sql).not.toMatch(/\bud\.username\b.*LIKE.*\bur1\.username\b.*LIKE/s);
    expect(sql).toContain(ACCOUNT_LIST_DISPLAYED_PARENT_SQL);
  });

  it("includes Stalker user id account logins for admin (admin User ID column)", () => {
    const { sql, params } = accountListSearchWhereClause("12345", {
      stalkerIdAccountLogins: ["alpha", "beta"],
    });
    expect(sql).toContain("a.account IN (?, ?)");
    expect(params).toContain("alpha");
    expect(params).toContain("beta");
  });
});
