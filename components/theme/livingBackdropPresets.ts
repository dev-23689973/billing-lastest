export type LivingBackdropVariant = "dark" | "light";

export const LIVING_BACKDROP_PRESETS: Record<
  LivingBackdropVariant,
  { bg: string; label: string }
> = {
  dark: { bg: "#020715", label: "HUD pipelines" },
  light: { bg: "#ffffff", label: "Aurora field" },
};
