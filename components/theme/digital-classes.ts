import { cn } from "@/lib/cn";

/** Shared Tailwind class fragments for the gaming / digital theme (use with `cn`). */

/** Dashboard / list panel — transparent in both themes so {@link DigitalLivingBackdrop} stays visible. */
export const livingGlassPanel =
  "border border-border/60 bg-transparent shadow-sm ring-1 ring-black/[0.04] dark:border-border/55 dark:ring-white/[0.06]";

/** Compact HUD bars and inset blocks */
export const livingGlassBar =
  "border border-border/60 bg-transparent shadow-sm dark:border-cyan-400/14 dark:bg-slate-950/40";

export const livingGlassInset =
  "border border-border/60 bg-transparent dark:border-slate-700/40 dark:bg-slate-950/30";

/**
 * Sidebar: optional cyan beam at the left edge; remainder stays transparent.
 * No backdrop-blur (blur hides the theme behind the strip).
 */
export const digitalSidebarShell =
  "relative bg-transparent backdrop-blur-none dark:shadow-[-10px_0_28px_-14px_rgba(0,0,0,0.08)]";

/** Main column beside fixed sidebar — stacks above theme backdrop; full width so content isn’t squeezed off-screen. */
export const digitalMainColumnEdge = "relative z-[10] min-h-0 min-w-0 w-full max-w-none bg-transparent";

/**
 * Beside the fixed sidebar (lg+): viewport-height column with overflow clipped so **AppMain** scrolls inside.
 * Prevents document-level scroll from pinning sticky chrome oddly or leaving header/container visually at the bottom.
 */
export const digitalAdminMainScrollShell =
  "flex min-h-0 flex-1 flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden";

/** Header + scrollable main only (footer sits outside in portal layouts). */
export const digitalAdminChromeBody =
  "flex min-h-0 flex-1 flex-col overflow-hidden";

export const digitalSidebarNavActive =
  "border border-cyan-400/45 bg-cyan-500/[0.12] text-cyan-50 shadow-[0_0_28px_-6px_rgba(34,211,238,0.55)] ring-1 ring-cyan-400/35";

export const digitalSidebarNavInactive =
  "border border-transparent text-muted-foreground hover:border-cyan-500/25 hover:bg-cyan-500/[0.06] hover:text-foreground";

/** Top bar: hairline only — backdrop visible in both themes. */
export const digitalHeaderShell =
  "border-b border-border/25 bg-transparent shadow-none backdrop-blur-none dark:border-cyan-500/20";

export const digitalLoginHeroPanel =
  "rounded-2xl border border-cyan-500/25 bg-transparent p-8 shadow-[0_0_60px_-20px_rgba(8,145,178,0.2)] ring-1 ring-black/[0.04] dark:border-fuchsia-500/20 dark:shadow-[0_0_80px_-30px_rgba(34,211,238,0.35)] dark:ring-white/[0.06]";

/** Large dashboard chart panels. */
export const digitalAdminChartPanel =
  cn(livingGlassPanel, "relative min-w-0 overflow-hidden rounded-2xl p-5 sm:p-6");

/** Scoped “living” glow for Recharts roots inside admin panels. */
export const digitalChartLivingRoot = "digital-chart-living";
