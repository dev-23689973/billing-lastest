import { describe, expect, it } from "vitest";
import { canSubscribeChannel, userPrivateChannel } from "@/lib/realtime/channels";

describe("realtime channels", () => {
  it("builds user channel from username", () => {
    expect(userPrivateChannel("admin")).toBe("private-user-admin");
  });

  it("authorizes admin ticket channel for ROOT only", () => {
    expect(canSubscribeChannel("private-tickets-admin", { username: "root", type: "ROOT" })).toBe(true);
    expect(canSubscribeChannel("private-tickets-admin", { username: "m1", type: "MNGR" })).toBe(false);
  });

  it("authorizes portal ticket channel for staff types", () => {
    expect(canSubscribeChannel("private-tickets-portal", { username: "d1", type: "RSLR" })).toBe(true);
    expect(canSubscribeChannel("private-tickets-portal", { username: "x", type: "ROOT" })).toBe(false);
  });
});
