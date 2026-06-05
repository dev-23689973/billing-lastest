import { describe, expect, it } from "vitest";
import { resolveLoginClientIp } from "./resolveLoginClientIp";

describe("resolveLoginClientIp", () => {
  it("prefers proxy headers over form field", () => {
    const h = new Headers({ "x-forwarded-for": "86.34.53.5" });
    expect(resolveLoginClientIp({ headers: h, formPublicIp: "1.2.3.4" })).toBe("86.34.53.5");
  });

  it("uses form public IP when headers only have loopback", () => {
    const h = new Headers({ "x-forwarded-for": "127.0.0.1" });
    expect(resolveLoginClientIp({ headers: h, formPublicIp: "86.34.53.5" })).toBe("86.34.53.5");
  });

  it("rejects private form IPs", () => {
    const h = new Headers();
    expect(resolveLoginClientIp({ headers: h, formPublicIp: "192.168.1.1" })).toBeNull();
  });
});
