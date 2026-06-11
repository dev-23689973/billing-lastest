import { describe, expect, it } from "vitest";
import {
  STAFF_LIST_ALL_COLUMN_IDS,
  parseStaffListColsFromSearchParam,
  staffListColsQueryFromSet,
  staffListColsSearchParam,
  staffListOrderedVisibleColumns,
} from "@/lib/adminStaffListColumns";

const ALL = ["name", "username", "credits"] as const;

describe("parseStaffListColsFromSearchParam", () => {
  it("returns all columns when param is missing", () => {
    expect(parseStaffListColsFromSearchParam(undefined, ALL)).toEqual(new Set(ALL));
  });

  it("parses comma-separated cols", () => {
    expect(parseStaffListColsFromSearchParam("username,credits", ALL)).toEqual(
      new Set(["username", "credits"]),
    );
  });

  it("parses legacy repeated cols keys as array", () => {
    expect(parseStaffListColsFromSearchParam(["username", "credits"], ALL)).toEqual(
      new Set(["username", "credits"]),
    );
  });

  it("omits name when not in param", () => {
    expect(parseStaffListColsFromSearchParam("username,credits", ALL).has("name")).toBe(false);
  });
});

describe("STAFF_LIST_ALL_COLUMN_IDS", () => {
  it("includes every managers staff-list column", () => {
    expect(STAFF_LIST_ALL_COLUMN_IDS).toContain("name");
    expect(STAFF_LIST_ALL_COLUMN_IDS).toContain("createdAt");
    expect(STAFF_LIST_ALL_COLUMN_IDS).toHaveLength(12);
  });
});

describe("staffListColsSearchParam", () => {
  it("omits param when all columns visible", () => {
    expect(staffListColsSearchParam(["name", "username", "credits"], ALL)).toBeUndefined();
  });

  it("joins visible columns", () => {
    expect(staffListColsSearchParam(["username", "credits"], ALL)).toBe("username,credits");
  });
});

describe("staffListOrderedVisibleColumns", () => {
  it("returns columns in canonical order", () => {
    expect(
      staffListOrderedVisibleColumns(new Set(["credits", "name"]), ALL),
    ).toEqual(["name", "credits"]);
  });

  it("excludes hidden role-specific columns", () => {
    expect(
      staffListOrderedVisibleColumns(new Set(ALL), ALL, ["name"]),
    ).toEqual(["username", "credits"]);
  });
});

describe("staffListColsQueryFromSet", () => {
  it("omits param when every column is visible", () => {
    expect(staffListColsQueryFromSet(new Set(ALL), ALL)).toBeUndefined();
  });

  it("serializes subset in canonical order", () => {
    expect(staffListColsQueryFromSet(new Set(["credits", "username"]), ALL)).toBe("username,credits");
  });
});
