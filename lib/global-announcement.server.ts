import { unstable_cache, updateTag } from "next/cache";
import {
  parseAnnouncementSlidesJson,
  type GlobalAnnouncementPayload,
} from "@/lib/global-announcement-data";
import { getSettings } from "@/lib/repos/billing";

const ANNOUNCEMENT_CACHE_TAG = "global-announcement";

async function loadGlobalAnnouncement(): Promise<GlobalAnnouncementPayload> {
  const settings = await getSettings();
  const html = settings.announcement?.trim() ?? "";
  const slides = settings.announcementSlides ?? [];
  const { ensureAnnouncementFlashHeading } = await import("@/lib/announcement-flash");
  const flash = ensureAnnouncementFlashHeading(settings.announcementFlash);
  return { html, slides, flash };
}

/** Cached announcement body + slide paths for layouts / modals. */
export const getGlobalAnnouncement = unstable_cache(loadGlobalAnnouncement, ["global-announcement-v3"], {
  tags: [ANNOUNCEMENT_CACHE_TAG],
});

export function revalidateGlobalAnnouncement(): void {
  updateTag(ANNOUNCEMENT_CACHE_TAG);
}

export { parseAnnouncementSlidesJson };
