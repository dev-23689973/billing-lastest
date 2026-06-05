import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders, pickBestClientIp } from "./requestClientIp";

describe("pickBestClientIp", () => {
  it("prefers a public IP over loopback in X-Forwarded-For", () => {
    expect(pickBestClientIp(["127.0.0.1", "86.34.53.5"])).toBe("86.34.53.5");
    expect(pickBestClientIp(["::ffff:127.0.0.1", "86.34.53.5"])).toBe("86.34.53.5");
  });
});

describe("getClientIpFromHeaders", () => {
  it("returns public IP from proxy headers and ignores loopback-only", () => {
    const h = new Headers({
      "x-forwarded-for": "127.0.0.1, 86.34.53.5",
    });
    expect(getClientIpFromHeaders(h)).toBe("86.34.53.5");
  });

  it("returns null when only loopback is present", () => {
    const h = new Headers({ "x-forwarded-for": "127.0.0.1" });
    expect(getClientIpFromHeaders(h)).toBeNull();
  });

  it("uses x-app-client-ip when set by middleware", () => {
    const h = new Headers({ "x-app-client-ip": "86.34.53.5" });
    expect(getClientIpFromHeaders(h)).toBe("86.34.53.5");
  });
});
