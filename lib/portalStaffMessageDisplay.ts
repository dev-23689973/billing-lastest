/** Client-safe portal staff message display helpers. */

export const PORTAL_STAFF_MESSAGE_TITLE_MAX = 200;

export function portalStaffMessageHeadline(msg: { title?: string | null; body?: string | null }): string {
  const title = String(msg.title ?? "").trim();
  if (title) return title;
  const body = String(msg.body ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "Message";
  return body.length > 72 ? `${body.slice(0, 72)}…` : body;
}
