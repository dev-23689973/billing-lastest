import { describe, expect, it } from "vitest";
import { portalStaffCanCreateSubscriber } from "@/lib/portal/portalStaffCreateSubscriber";

describe("portalStaffCanCreateSubscriber", () => {
  it("requires a positive integer balance", () => {
    expect(portalStaffCanCreateSubscriber(1)).toBe(true);
    expect(portalStaffCanCreateSubscriber(0)).toBe(false);
    expect(portalStaffCanCreateSubscriber(-1)).toBe(false);
    expect(portalStaffCanCreateSubscriber(Number.NaN)).toBe(false);
  });
});
