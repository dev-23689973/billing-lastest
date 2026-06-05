/** Re-export client-safe announcement helpers. */
export {
  announcementContentHash,
  announcementDismissStorageKey,
  announcementSessionDismissStorageKey,
  isAnnouncementEmpty,
  isAnnouncementHtmlEmpty,
  normalizeAnnouncementSlides,
  parseAnnouncementSlidesJson,
  serializeAnnouncementSlides,
  type GlobalAnnouncementPayload,
} from "@/lib/global-announcement-data";
