import { describe, expect, it } from "vitest";
import { isStalkerUserIdSearchQuery } from "@/lib/repos/stalkerUserIdSearch";

describe("isStalkerUserIdSearchQuery", () => {
  it("accepts digit-only queries for Stalker user id", () => {
    expect(isStalkerUserIdSearchQuery("42")).toBe(true);
    expect(isStalkerUserIdSearchQuery("12345")).toBe(true);
  });

  it("rejects non-numeric and account-style logins", () => {
    expect(isStalkerUserIdSearchQuery("")).toBe(false);
    expect(isStalkerUserIdSearchQuery("149peelstreettt")).toBe(false);
    expect(isStalkerUserIdSearchQuery("00:1A:79")).toBe(false);
    expect(isStalkerUserIdSearchQuery("adminz")).toBe(false);
  });
});
