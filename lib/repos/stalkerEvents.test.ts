import { describe, expect, it, vi } from "vitest";
import { normalizeMacForStalker, resolveStalkerMessageTargetsByAccounts } from "@/lib/repos/stalkerEvents";
import * as stalkerUserPackages from "@/lib/repos/stalkerUserPackages";

describe("stalkerEvents", () => {
  describe("normalizeMacForStalker", () => {
    it("uppercases and normalizes separators", () => {
      expect(normalizeMacForStalker("00-1a-79-aa-bb-cc")).toBe("00:1A:79:AA:BB:CC");
      expect(normalizeMacForStalker(" 00:1a:79:aa:bb:cc ")).toBe("00:1A:79:AA:BB:CC");
    });

    it("treats whitespace-only as empty", () => {
      expect(normalizeMacForStalker("   ")).toBe("");
    });
  });

  describe("resolveStalkerMessageTargetsByAccounts", () => {
    it("skips accounts with empty MAC before profile lookup", async () => {
      const spy = vi.spyOn(stalkerUserPackages, "getStalkerUserDbIdByLogin").mockResolvedValue(99);

      try {
        const result = await resolveStalkerMessageTargetsByAccounts(["has-mac", "no-mac"], async (account) =>
          account === "has-mac" ? "00:1A:79:11:22:33" : "",
        );

        expect(result.uids).toEqual([99]);
        expect(result.skippedNoMac).toEqual(["no-mac"]);
        expect(result.skippedNoProfile).toEqual([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("has-mac");
      } finally {
        spy.mockRestore();
      }
    });

    it("skips accounts without a stalker profile", async () => {
      const spy = vi.spyOn(stalkerUserPackages, "getStalkerUserDbIdByLogin").mockImplementation(async (login) =>
        login === "linked" ? 42 : null,
      );

      try {
        const result = await resolveStalkerMessageTargetsByAccounts(["linked", "missing-profile"], async () =>
          "00:1A:79:44:55:66",
        );

        expect(result.uids).toEqual([42]);
        expect(result.skippedNoMac).toEqual([]);
        expect(result.skippedNoProfile).toEqual(["missing-profile"]);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
