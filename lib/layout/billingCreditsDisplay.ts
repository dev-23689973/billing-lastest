import type { HeaderStatsClientDto } from "@/lib/server/realtimeClientData";

export type BillingCreditsDisplay = {
  value: string;
  title: string;
  ariaLabel: string;
};

export function resolveBillingCreditsDisplay(
  stats: HeaderStatsClientDto | { error: string } | null,
): BillingCreditsDisplay | null {
  if (!stats || "error" in stats) return null;
  if (stats.isAdmin) {
    return {
      value: "∞",
      title: "Unlimited credits",
      ariaLabel: "Unlimited credits",
    };
  }
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.max(0, stats.credits ?? 0),
  );
  return {
    value: formatted,
    title: `Credits: ${formatted}`,
    ariaLabel: `Credits ${formatted}`,
  };
}

export function formatBillingActiveCount(stats: HeaderStatsClientDto | { error: string } | null): string {
  if (!stats || "error" in stats) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, stats.active ?? 0));
}
