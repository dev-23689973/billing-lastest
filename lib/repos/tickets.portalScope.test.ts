import { describe, expect, it } from "vitest";
import { portalTicketOwnerWhere } from "./tickets";

describe("portalTicketOwnerWhere", () => {
  it("scopes to creator billing user id only", () => {
    const owner = portalTicketOwnerWhere({ billingUserId: 42, canCreateTickets: true });
    expect(owner.sql).toBe("user_id = ?");
    expect(owner.params).toEqual([42]);
  });

  it("supports custom column alias", () => {
    const owner = portalTicketOwnerWhere({ billingUserId: 7, canCreateTickets: false }, "t.user_id");
    expect(owner.sql).toBe("t.user_id = ?");
    expect(owner.params).toEqual([7]);
  });
});
