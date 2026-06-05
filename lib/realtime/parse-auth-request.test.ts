import { describe, expect, it } from "vitest";
import { parsePusherAuthRequest } from "@/lib/realtime/parse-auth-request";

describe("parsePusherAuthRequest", () => {
  it("parses x-www-form-urlencoded body", async () => {
    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "socket_id=123.456&channel_name=presence-billing",
    });
    await expect(parsePusherAuthRequest(req)).resolves.toEqual({
      socket_id: "123.456",
      channel_name: "presence-billing",
    });
  });

  it("parses JSON body", async () => {
    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ socket_id: "1.2", channel_name: "private-user-x" }),
    });
    await expect(parsePusherAuthRequest(req)).resolves.toEqual({
      socket_id: "1.2",
      channel_name: "private-user-x",
    });
  });
});
