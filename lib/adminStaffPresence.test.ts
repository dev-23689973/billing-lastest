import { describe, expect, it } from "vitest";
import { deriveStaffPresenceFromRealtime, isUsernameOnlineInPanel, normalizeStaffUsername } from "@/lib/adminStaffPresence";

describe("adminStaffPresence realtime", () => {
  it("normalizes usernames for comparison", () => {
    expect(normalizeStaffUsername(" Dealer01 ")).toBe("dealer01");
  });

  it("detects online usernames in set", () => {
    const set = new Set(["dealer01", "mgr1"]);
    expect(isUsernameOnlineInPanel("dealer01", set)).toBe(true);
    expect(isUsernameOnlineInPanel("DEALER01", set)).toBe(true);
    expect(isUsernameOnlineInPanel("other", set)).toBe(false);
  });

  it("maps realtime to online/offline styles", () => {
    expect(deriveStaffPresenceFromRealtime(true).state).toBe("ONLINE");
    expect(deriveStaffPresenceFromRealtime(false).state).toBe("OFFLINE");
  });
});
