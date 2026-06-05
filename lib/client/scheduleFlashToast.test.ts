import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/client/showFlashToastItems", () => ({
  showFlashToastItems: vi.fn(),
}));

import { showFlashToastItems } from "@/lib/client/showFlashToastItems";
import { flashToastKey, scheduleFlashToastItems } from "@/lib/client/scheduleFlashToast";

describe("scheduleFlashToastItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes duplicate schedule calls (Strict Mode safe)", async () => {
    const items = [{ type: "success" as const, message: "Saved." }];
    const key = flashToastKey("/admin/settings", "ok=1", items);
    scheduleFlashToastItems(key, items);
    scheduleFlashToastItems(key, items);
    await new Promise((r) => queueMicrotask(r as VoidFunction));
    expect(showFlashToastItems).toHaveBeenCalledTimes(1);
  });
});
