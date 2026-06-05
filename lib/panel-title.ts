import { unstable_cache, updateTag } from "next/cache";
import * as repo from "@/lib/repos/billing";

export const DEFAULT_PANEL_TITLE = "Billing Panel";

async function loadPanelTitle(): Promise<string> {
  return repo.getPanelTitle();
}

/** Cached panel title from `settings.title` (invalidates on settings save). */
export const getPanelTitle = unstable_cache(loadPanelTitle, ["panel-title-v1"], {
  tags: ["panel-title"],
});

/** Call from server actions after saving General tab (read-your-own-writes). */
export function revalidatePanelTitle(): void {
  updateTag("panel-title");
}
