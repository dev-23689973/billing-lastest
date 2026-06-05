import { saveAnnouncementSlideFile } from "@/lib/announcement-slides-fs.server";
import type { SessionPayload } from "@/lib/session";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function uploadAnnouncementSlideForClient(file: File, session: SessionPayload) {
  if (session.type !== "ROOT") return { ok: false as const, error: "forbidden" };

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false as const, error: "unsupported_type" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const { publicPath } = await saveAnnouncementSlideFile(bytes, mime);
    return { ok: true as const, path: publicPath };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "file_too_large") return { ok: false as const, error: "file_too_large" };
    if (msg === "unsupported_type") return { ok: false as const, error: "unsupported_type" };
    console.error("[announcement-slide-upload]", e);
    return { ok: false as const, error: "server_error" };
  }
}
