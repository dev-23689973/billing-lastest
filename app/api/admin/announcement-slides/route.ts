import { saveAnnouncementSlideFile } from "@/lib/announcement-slides-fs.server";
import { ANNOUNCEMENT_SLIDES_MAX_COUNT } from "@/lib/global-announcement-data";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiJson({ error: "missing_file" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return apiJson({ error: "unsupported_type" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const { publicPath } = await saveAnnouncementSlideFile(bytes, mime);
    return apiJson({ path: publicPath });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "file_too_large") {
      return apiJson({ error: "file_too_large" }, { status: 400 });
    }
    if (msg === "unsupported_type") {
      return apiJson({ error: "unsupported_type" }, { status: 400 });
    }
    console.error("[announcement-slides] upload:", e);
    return apiJson({ error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  return apiJson({ maxSlides: ANNOUNCEMENT_SLIDES_MAX_COUNT });
}

