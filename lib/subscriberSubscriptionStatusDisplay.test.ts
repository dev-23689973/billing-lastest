import { describe, expect, it } from "vitest";
import { getSubscriberSubscriptionStatusDisplay } from "@/lib/subscriberSubscriptionStatusDisplay";

describe("subscriberSubscriptionStatusDisplay", () => {
  it("marks past expiry as expired", () => {
    const out = getSubscriberSubscriptionStatusDisplay("2020-01-08 00:00:00");
    expect(out.statusLabel).toBe("Expired");
    expect(out.tone).toBe("expired");
  });

  it("shows days left when expiry is within a week", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, "0");
    const d = String(future.getDate()).padStart(2, "0");
    const out = getSubscriberSubscriptionStatusDisplay(`${y}-${m}-${d} 12:00:00`);
    expect(out.statusLabel).toBe("5 days left");
    expect(out.tone).toBe("soon");
  });

  it("shows active for distant future expiry", () => {
    const future = new Date();
    future.setDate(future.getDate() + 8);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, "0");
    const d = String(future.getDate()).padStart(2, "0");
    const out = getSubscriberSubscriptionStatusDisplay(`${y}-${m}-${d} 12:00:00`);
    expect(out.statusLabel).toBe("Active");
    expect(out.tone).toBe("active");
  });
});
