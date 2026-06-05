/**
 * Canonical operator role palette — the single source of truth for any HUD/legend
 * that distinguishes Managers / Resellers / Dealers by color.
 *
 *  - Managers  → violet  (`#a78bfa`, `tw violet-400`)
 *  - Resellers → cyan    (`#22d3ee`, `tw cyan-400`)
 *  - Dealers   → rose    (`#fb7185`, `tw rose-400`)
 *
 * Match these hexes when passing to SVG/canvas (e.g. `DualRingMetric.color`),
 * and use `*_DOT_CLASS` / `*_TEXT_CLASS` for matching DOM elements.
 */

export const OPERATOR_ROLE_COLORS = {
  manager: "#a78bfa",
  reseller: "#22d3ee",
  dealer: "#fb7185",
} as const;

export type OperatorRole = keyof typeof OPERATOR_ROLE_COLORS;

/** Solid-fill role dot with a matching neon glow (use in legends, table rows). */
export const OPERATOR_ROLE_DOT_CLASS: Record<OperatorRole, string> = {
  manager: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.55)]",
  reseller: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.55)]",
  dealer: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.55)]",
};

/** Foreground text accent (matches role hex at a readable lightness). */
export const OPERATOR_ROLE_TEXT_CLASS: Record<OperatorRole, string> = {
  manager: "text-violet-200",
  reseller: "text-cyan-700 dark:text-cyan-200",
  dealer: "text-rose-200",
};

/** Field icons in staff / operator forms. */
export const OPERATOR_ROLE_ICON_CLASS: Record<OperatorRole, string> = {
  manager: "text-violet-600/85 dark:text-violet-400/75",
  reseller: "text-cyan-600/85 dark:text-cyan-400/75",
  dealer: "text-rose-600/85 dark:text-rose-400/75",
};

/** Selected segment in Manager / Reseller / Dealer toggles. */
export const OPERATOR_ROLE_SEGMENT_ACTIVE_CLASS: Record<OperatorRole, string> = {
  manager:
    "border-violet-500/50 bg-violet-500/12 text-foreground dark:border-violet-400/40 dark:bg-violet-400/12 dark:text-zinc-50",
  reseller:
    "border-cyan-500/50 bg-cyan-500/12 text-foreground dark:border-cyan-400/40 dark:bg-cyan-400/12 dark:text-zinc-50",
  dealer: "border-rose-500/50 bg-rose-500/12 text-foreground dark:border-rose-400/40 dark:bg-rose-400/12 dark:text-zinc-50",
};

export const OPERATOR_ROLE_SEGMENT_IDLE_HOVER_CLASS: Record<OperatorRole, string> = {
  manager:
    "hover:border-violet-600/28 hover:bg-muted/40 hover:text-foreground dark:hover:border-violet-400/18",
  reseller: "hover:border-cyan-600/28 hover:bg-muted/40 hover:text-foreground dark:hover:border-cyan-400/18",
  dealer: "hover:border-rose-600/28 hover:bg-muted/40 hover:text-foreground dark:hover:border-rose-400/18",
};
