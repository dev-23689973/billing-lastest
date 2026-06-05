import { revalidatePath } from "next/cache";
import { revalidateAdminDashboardCaches } from "@/lib/dashboard/revalidateAdminDashboardCaches";
import { getSession } from "@/lib/session";
import { getPortalTicketScope, insertTicket, type PortalTicketRole } from "@/lib/repos/tickets";
import { canCreateTicket } from "@/lib/tickets/canCreateTicket";
import { apiJson } from "@/lib/dto/apiJson";

type CreateBody = {
  subject?: string;
  description?: string;
  priority?: number;
  category_id?: number;
  /** Preferred: all channels owned by one ticket. */
  channels?: Array<{ channel_id?: number; channel_number?: number }>;
  /** Legacy single-channel payload. */
  channel_id?: number;
  channel_number?: number;
  flags?: {
    no_audio?: boolean;
    no_video?: boolean;
    stream_error?: boolean;
    no_epg?: boolean;
    catch_up_needed?: boolean;
    epg_needed?: boolean;
    file_missing?: boolean;
    wrong_channel_name?: boolean;
  };
};

function revalidateTicketScopes() {
  revalidatePath("/admin/tickets/dashboard");
  revalidatePath("/manager/tickets");
  revalidatePath("/manager/tickets/dashboard");
  revalidatePath("/dealer/tickets");
  revalidatePath("/dealer/tickets/dashboard");
  revalidatePath("/reseller/tickets");
  revalidatePath("/reseller/tickets/dashboard");
}

function parseChannels(body: CreateBody | null): Array<{ channel_id: number; channel_number: number }> {
  const fromList = Array.isArray(body?.channels) ? body.channels : [];
  const parsed = fromList
    .map((ch) => ({
      channel_id: Number(ch?.channel_id),
      channel_number: Number(ch?.channel_number),
    }))
    .filter((ch) => Number.isFinite(ch.channel_id) && ch.channel_id > 0 && Number.isFinite(ch.channel_number) && ch.channel_number > 0);
  if (parsed.length > 0) return parsed;

  const channel_id = Number(body?.channel_id);
  const channel_number = Number(body?.channel_number);
  if (Number.isFinite(channel_id) && channel_id > 0 && Number.isFinite(channel_number) && channel_number > 0) {
    return [{ channel_id, channel_number }];
  }
  return [];
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return apiJson({ error: "forbidden" }, { status: 401 });
  if (!(await canCreateTicket(session))) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const role: PortalTicketRole | null =
    session.type === "MNGR" ? "MNGR" : session.type === "SRSLR" ? "SRSLR" : session.type === "RSLR" ? "RSLR" : null;
  if (!role) return apiJson({ error: "forbidden" }, { status: 403 });
  const scope = await getPortalTicketScope(session.username, role);
  if (!scope) return apiJson({ error: "forbidden" }, { status: 403 });
  const userId = scope.billingUserId;

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  const subject = String(body?.subject ?? "").trim();
  const descriptionHtml = String(body?.description ?? "");
  const priority = Number(body?.priority);
  const category_id = Number(body?.category_id);
  const channels = parseChannels(body);

  if (!subject || !Number.isFinite(priority) || priority < 1 || priority > 3) {
    return apiJson({ error: "validation" }, { status: 400 });
  }
  if (!Number.isFinite(category_id) || category_id <= 0) {
    return apiJson({ error: "validation" }, { status: 400 });
  }

  try {
    const id = await insertTicket({
      subject,
      descriptionHtml,
      priority_id: priority,
      category_id,
      channels,
      flags: {
        no_audio: Boolean(body?.flags?.no_audio),
        no_video: Boolean(body?.flags?.no_video),
        stream_error: Boolean(body?.flags?.stream_error),
        no_epg: Boolean(body?.flags?.no_epg),
        catch_up_needed: Boolean(body?.flags?.catch_up_needed),
        epg_needed: Boolean(body?.flags?.epg_needed),
        file_missing: Boolean(body?.flags?.file_missing),
        wrong_channel_name: Boolean(body?.flags?.wrong_channel_name),
      },
      user_id: userId,
      actorUsername: session.username,
    });

    revalidateAdminDashboardCaches();
    revalidateTicketScopes();

    return apiJson({ ok: true, id, channelCount: channels.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("POST /api/tickets/create failed:", error);
    return apiJson({ error: "db", detail: message }, { status: 500 });
  }
}

