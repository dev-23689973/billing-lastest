import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { getSettings } from "@/lib/data";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";
import { parseSettingsTabId } from "@/lib/settings-tabs";
import { getTicketsDbHealth } from "@/lib/repos/tickets";

type Props = { searchParams?: Promise<{ ok?: string; error?: string; tab?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  let settings: Awaited<ReturnType<typeof getSettings>> | undefined;
  let ticketsHealth: Awaited<ReturnType<typeof getTicketsDbHealth>> | undefined;
  let settingsLoadFailed = false;
  let settingsLoadMessage = "";
  try {
    [settings, ticketsHealth] = await Promise.all([getSettings(), getTicketsDbHealth()]);
  } catch (err) {
    console.error("[admin/settings] getSettings:", err);
    settingsLoadFailed = true;
    settingsLoadMessage =
      process.env.NODE_ENV === "development"
        ? err instanceof Error
          ? err.message
          : String(err)
        : "Could not load settings. Contact your administrator.";
  }

  const settingsFlashes: FlashToastItem[] = [
    ...(sp.ok ? [{ type: "success" as const, message: "Saved." }] : []),
    ...(sp.error === "nosettings"
      ? [{ type: "error" as const, message: "Settings could not be loaded. Contact your administrator." }]
      : []),
    ...(sp.error === "validation"
      ? [
          {
            type: "error" as const,
            message:
              "Check fields: title (3–50 characters), global max add credit (1–1,000,000), minimums ≤ global max, default PIN (4 digits), retry trial count (0 or more).",
          },
        ]
      : []),
    ...(sp.error === "match" ? [{ type: "error" as const, message: "New passwords do not match." }] : []),
    ...(sp.error === "old" ? [{ type: "error" as const, message: "Current password is incorrect." }] : []),
    ...(sp.error === "old_len"
      ? [{ type: "error" as const, message: "Current password must be between 3 and 100 characters." }]
      : []),
    ...(sp.error === "new_len"
      ? [{ type: "error" as const, message: "New password must be between 4 and 12 characters." }]
      : []),
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-none flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-5 lg:p-6">
      <FlashToastsBoundary items={settingsFlashes} stripParams={["ok", "error"]} />
      {settingsLoadFailed ? (
        <div
          role="alert"
          className="shrink-0 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-foreground shadow-sm"
        >
          <p className="font-semibold text-destructive">Settings data unavailable</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">{settingsLoadMessage}</p>
        </div>
      ) : settings ? (
        <AdminSettingsView
          settings={settings}
          ticketsHealth={ticketsHealth}
          initialTab={parseSettingsTabId(sp.tab)}
        />
      ) : null}
    </div>
  );
}
