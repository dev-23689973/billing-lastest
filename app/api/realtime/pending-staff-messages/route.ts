import {
  listDismissPortalStaffMessagesForUser,
  listPendingPortalStaffMessagesForUser,
  listReadPortalStaffMessagesForUser,
} from "@/lib/repos/portalStaffMessages";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiJson({ error: "unauthorized" }, { status: 401 });
  }

  const username = session.username;
  const load = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[pending-staff-messages] ${label} failed:`, err);
      return [] as T;
    }
  };
  const [messages, dismiss, read] = await Promise.all([
    load("active", () => listPendingPortalStaffMessagesForUser(username, 50)),
    load("dismiss", () => listDismissPortalStaffMessagesForUser(username, 50)),
    load("read", () => listReadPortalStaffMessagesForUser(username, 50)),
  ]);
  return apiJson(
    { messages, dismiss, read, dismissed: [...dismiss, ...read] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

