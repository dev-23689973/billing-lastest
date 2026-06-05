import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

import { toast } from "sonner";
import { showFlashToastItems } from "@/lib/client/showFlashToastItems";

describe("showFlashToastItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps flash item types to sonner", () => {
    showFlashToastItems([
      { type: "success", message: "Saved." },
      { type: "error", message: "Failed." },
      { type: "warning", message: "Careful." },
      { type: "info", message: "Note." },
    ]);
    expect(toast.success).toHaveBeenCalledWith("Saved.", undefined);
    expect(toast.error).toHaveBeenCalledWith("Failed.", undefined);
    expect(toast.warning).toHaveBeenCalledWith("Careful.", undefined);
    expect(toast.message).toHaveBeenCalledWith("Note.", undefined);
  });

  it("passes description option when set", () => {
    showFlashToastItems([{ type: "success", message: "Sent", description: "Details" }]);
    expect(toast.success).toHaveBeenCalledWith("Sent", { description: "Details" });
  });
});
