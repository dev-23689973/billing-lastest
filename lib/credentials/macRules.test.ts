import { describe, expect, it } from "vitest";
import { generateRandomMac } from "@/lib/credentials/macRules";
import { validateMacFormat } from "@/lib/mac/macFormat";

describe("macRules", () => {
  it("generates Infomir-style MAC addresses", () => {
    for (let i = 0; i < 20; i++) {
      const mac = generateRandomMac();
      expect(mac).toMatch(/^00:1A:79:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
      expect(validateMacFormat(mac).ok).toBe(true);
    }
  });

  it("rejects incomplete MAC", () => {
    expect(validateMacFormat("00:1A:79").ok).toBe(false);
  });
});
