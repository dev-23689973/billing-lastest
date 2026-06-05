import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";

export type TicketChannelInput = {
  channel_id: number;
  channel_number: number;
};

export type TicketChannelLink = TicketChannelInput & {
  sort_order: number;
};

export type TicketChannelsDisplay = {
  channelIds: number[];
  channelNumbers: number[];
  channelNames: string[];
  /** Comma-separated labels for table cells and modals. */
  channelName: string;
  primaryChannelId: number;
  primaryChannelNumber: number;
};

let ticketChannelsTableReady: Promise<void> | null = null;

export async function ensureTicketChannelsTable(): Promise<void> {
  if (!ticketChannelsTableReady) {
    ticketChannelsTableReady = (async () => {
      const pool = getBillingPool();
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ticket_channels (
          ticket_id INT UNSIGNED NOT NULL,
          channel_id INT UNSIGNED NOT NULL,
          channel_number INT UNSIGNED NOT NULL DEFAULT 0,
          sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (ticket_id, channel_id),
          KEY idx_ticket_channels_ticket (ticket_id),
          KEY idx_ticket_channels_channel (channel_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })().catch((err) => {
      ticketChannelsTableReady = null;
      throw err;
    });
  }
  await ticketChannelsTableReady;
}

export async function insertTicketChannelLinks(
  conn: PoolConnection,
  ticketId: number,
  channels: TicketChannelInput[],
): Promise<void> {
  if (channels.length === 0) return;
  await ensureTicketChannelsTable();
  const values = channels.map((ch, i) => [ticketId, ch.channel_id, ch.channel_number, i]);
  const placeholders = values.map(() => "(?, ?, ?, ?)").join(", ");
  const flat = values.flat();
  await conn.execute(
    `INSERT INTO ticket_channels (ticket_id, channel_id, channel_number, sort_order) VALUES ${placeholders}`,
    flat,
  );
}

export async function deleteTicketChannelLinks(conn: PoolConnection, ticketId: number): Promise<void> {
  try {
    await conn.execute("DELETE FROM ticket_channels WHERE ticket_id = ?", [ticketId]);
  } catch {
    /* table may not exist on older DBs */
  }
}

async function loadChannelLinksByTicketIds(ticketIds: number[]): Promise<Map<number, TicketChannelLink[]>> {
  const out = new Map<number, TicketChannelLink[]>();
  if (ticketIds.length === 0) return out;

  try {
    await ensureTicketChannelsTable();
    const pool = getBillingPool();
    const placeholders = ticketIds.map(() => "?").join(", ");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ticket_id, channel_id, channel_number, sort_order
       FROM ticket_channels
       WHERE ticket_id IN (${placeholders})
       ORDER BY ticket_id ASC, sort_order ASC, channel_id ASC`,
      ticketIds,
    );
    for (const r of rows) {
      const ticketId = Number(r.ticket_id ?? 0);
      if (!ticketId) continue;
      const list = out.get(ticketId) ?? [];
      list.push({
        channel_id: Number(r.channel_id ?? 0),
        channel_number: Number(r.channel_number ?? 0),
        sort_order: Number(r.sort_order ?? 0),
      });
      out.set(ticketId, list);
    }
  } catch {
    return out;
  }
  return out;
}

async function loadItvChannelNames(channelIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (channelIds.length === 0) return map;
  const stalker = getStalkerPool();
  if (!stalker) return map;
  try {
    const [channelRows] = await stalker.execute<RowDataPacket[]>(
      `SELECT id, name FROM itv WHERE id IN (${channelIds.join(",")})`,
    );
    for (const c of channelRows) {
      map.set(Number(c.id ?? 0), String(c.name ?? ""));
    }
  } catch {
    /* stalker optional */
  }
  return map;
}

/** Resolves multi-channel ownership for list/detail views (junction + legacy single column). */
export async function resolveTicketsChannelDisplay(
  tickets: Array<{ id: number; channel_id: number; channel_number: number }>,
): Promise<Map<number, TicketChannelsDisplay>> {
  const result = new Map<number, TicketChannelsDisplay>();
  if (tickets.length === 0) return result;

  const linksByTicket = await loadChannelLinksByTicketIds(tickets.map((t) => t.id));
  const allChannelIds = new Set<number>();
  for (const t of tickets) {
    const links = linksByTicket.get(t.id);
    if (links?.length) {
      for (const link of links) {
        if (link.channel_id > 0) allChannelIds.add(link.channel_id);
      }
    } else if (t.channel_id > 0) {
      allChannelIds.add(t.channel_id);
    }
  }
  const nameMap = await loadItvChannelNames([...allChannelIds]);

  for (const t of tickets) {
    const links = linksByTicket.get(t.id);
    const channelIds: number[] = [];
    const channelNumbers: number[] = [];
    if (links?.length) {
      for (const link of links) {
        channelIds.push(link.channel_id);
        channelNumbers.push(link.channel_number);
      }
    } else if (t.channel_id > 0) {
      channelIds.push(t.channel_id);
      channelNumbers.push(t.channel_number);
    }
    const channelNames = channelIds.map((id) => nameMap.get(id) ?? "").filter(Boolean);
    const channelName =
      channelNames.length > 0
        ? channelNames.join(", ")
        : channelNumbers.length > 0
          ? channelNumbers.map((n) => `#${n}`).join(", ")
          : "";
    result.set(t.id, {
      channelIds,
      channelNumbers,
      channelNames,
      channelName,
      primaryChannelId: channelIds[0] ?? 0,
      primaryChannelNumber: channelNumbers[0] ?? 0,
    });
  }
  return result;
}

export async function listTicketChannelLinks(ticketId: number): Promise<TicketChannelLink[]> {
  const map = await loadChannelLinksByTicketIds([ticketId]);
  return map.get(ticketId) ?? [];
}

export async function getTicketChannelsDisplayForTicket(
  ticket: { id: number; channel_id: number; channel_number: number },
): Promise<TicketChannelsDisplay> {
  const map = await resolveTicketsChannelDisplay([ticket]);
  return (
    map.get(ticket.id) ?? {
      channelIds: ticket.channel_id > 0 ? [ticket.channel_id] : [],
      channelNumbers: ticket.channel_number > 0 ? [ticket.channel_number] : [],
      channelNames: [],
      channelName: "",
      primaryChannelId: ticket.channel_id,
      primaryChannelNumber: ticket.channel_number,
    }
  );
}
