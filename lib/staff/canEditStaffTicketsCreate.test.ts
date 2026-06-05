import { describe, expect, it } from "vitest";
import { canEditStaffTicketsCreatePermission } from "./canEditStaffTicketsCreate";

describe("canEditStaffTicketsCreatePermission", () => {
  it("allows admin only", () => {
    expect(canEditStaffTicketsCreatePermission("admin")).toBe(true);
    expect(canEditStaffTicketsCreatePermission("manager")).toBe(false);
    expect(canEditStaffTicketsCreatePermission("reseller")).toBe(false);
  });
});
