import { describe, expect, it } from "vitest";
import { normalizeClientIp } from "./normalizeClientIp";

describe("normalizeClientIp", () => {
  it("unwraps IPv4-mapped IPv6 addresses", () => {
    expect(normalizeClientIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeClientIp("::FFFF:192.168.1.10")).toBe("192.168.1.10");
  });

  it("maps loopback ::1 to 127.0.0.1", () => {
    expect(normalizeClientIp("::1")).toBe("127.0.0.1");
  });

  it("keeps plain IPv4 and returns empty for invalid placeholders", () => {
    expect(normalizeClientIp("203.0.113.5")).toBe("203.0.113.5");
    expect(normalizeClientIp("86.34.53.5")).toBe("86.34.53.5");
    expect(normalizeClientIp("0.0.0.0")).toBe("");
    expect(normalizeClientIp("")).toBe("");
  });
});
