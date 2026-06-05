import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ANNOUNCEMENT_SLIDE_MAX_BYTES,
  ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX,
  isValidAnnouncementSlidePath,
} from "@/lib/global-announcement-data";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "announcements");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function ensureAnnouncementSlidesUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveAnnouncementSlideFile(
  bytes: Buffer,
  mime: string,
): Promise<{ publicPath: string; filename: string }> {
  const ext = MIME_TO_EXT[mime];
  if (!ext) throw new Error("unsupported_type");
  if (bytes.byteLength > ANNOUNCEMENT_SLIDE_MAX_BYTES) throw new Error("file_too_large");

  await ensureAnnouncementSlidesUploadDir();
  const filename = `${randomUUID()}${ext}`;
  const diskPath = path.join(UPLOAD_DIR, filename);
  await writeFile(diskPath, bytes);

  return {
    filename,
    publicPath: `${ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX}${filename}`,
  };
}

export async function deleteAnnouncementSlideFile(publicPath: string): Promise<void> {
  if (!isValidAnnouncementSlidePath(publicPath)) return;
  const filename = publicPath.slice(ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX.length);
  const diskPath = path.join(UPLOAD_DIR, filename);
  try {
    await unlink(diskPath);
  } catch {
    /* missing file is fine */
  }
}

export async function deleteOrphanAnnouncementSlides(
  previous: string[],
  next: string[],
): Promise<void> {
  const keep = new Set(next);
  for (const p of previous) {
    if (!keep.has(p)) await deleteAnnouncementSlideFile(p);
  }
}
