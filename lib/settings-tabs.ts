export const SETTINGS_TAB_IDS = [
  "general",
  "announcement",
  "billing",
  "notifications",
  "security",
  "appearance",
] as const;

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

const TAB_SET = new Set<string>(SETTINGS_TAB_IDS);

export function parseSettingsTabId(raw: string | null | undefined): SettingsTabId {
  const t = (raw ?? "general").toLowerCase();
  return (TAB_SET.has(t) ? t : "general") as SettingsTabId;
}
