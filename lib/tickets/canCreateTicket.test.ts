import { describe, expect, it } from "vitest";
import { canSessionCreateTicket } from "./canCreateTicket";

describe("canSessionCreateTicket", () => {
  it("denies ROOT (admin)", () => {
    expect(canSessionCreateTicket({ type: "ROOT" })).toBe(false);
  });

  it("allows portal roles at session-type level", () => {
    expect(canSessionCreateTicket({ type: "MNGR" })).toBe(true);
    expect(canSessionCreateTicket({ type: "SRSLR" })).toBe(true);
    expect(canSessionCreateTicket({ type: "RSLR" })).toBe(true);
  });
});
