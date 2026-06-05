"use server";

import { resolveClientIpForClient } from "@/lib/server/clientIpClientData";
import {
  exportSubscribersCsvForClient,
  type SubscribersExportFilters,
  type SubscribersExportScope,
} from "@/lib/server/subscribersExportClientData";
import { uploadAnnouncementSlideForClient } from "@/lib/server/announcementClientData";
import {
  dismissPortalStaffMessageForClient,
  loadPortalStaffInboxForClient,
  markPortalStaffMessageReadForClient,
} from "@/lib/server/messagesClientData";
import { loadMessageStalkerShellForClient } from "@/lib/server/messagesStalkerClientData";
import {
  parseStaffInlinePortal,
  parseUserInlinePortal,
  updateStaffInlineForClient,
  updateUserInlineForClient,
} from "@/lib/server/inlineEditClientData";
import { loadHeaderStatsForClient, loadOpenTicketsSnapshotForClient } from "@/lib/server/realtimeClientData";
import { editorApiBaseToPortal } from "@/lib/server/modalScope";
import { saveStaffEditorForClient, type StaffEditorSaveBody } from "@/lib/server/staffEditorSaveData";
import {
  createTicketForClient,
  dismissTicketAlertForClient,
  loadTicketChannelByNumberForClient,
  loadTicketChannelsForClient,
  loadTicketCommentsForClient,
  loadTicketPreviewForClient,
  loadTicketsTableForClient,
  manageTicketForClient,
  postTicketCommentForClient,
  type CreateTicketClientInput,
} from "@/lib/server/ticketsClientData";
import {
  loadTransactionsCreditFlowForClient,
  loadTransactionsLedgerSummaryForClient,
  loadTransactionsTableForClient,
} from "@/lib/server/transactionsClientData";
import { getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return { ok: true as const, session };
}

export async function loadTicketPreviewAction(ticketId: number) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTicketPreviewForClient(ticketId, auth.session);
}

export async function loadTicketCommentsAction(ticketId: number) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTicketCommentsForClient(ticketId, auth.session);
}

export async function postTicketCommentAction(ticketId: number, comment: string) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return postTicketCommentForClient(ticketId, comment, auth.session);
}

export async function manageTicketAction(
  ticketId: number,
  input: { action: "delete" } | { action: "update"; status: number; priority: number },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return manageTicketForClient(ticketId, input, auth.session);
}

export async function dismissTicketAlertAction(ticketId: number) {
  const auth = await requireSession();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return dismissTicketAlertForClient(ticketId, auth.session);
}

export async function loadTicketChannelsAction(categoryId: number) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTicketChannelsForClient(categoryId, auth.session);
}

export async function loadTicketsTableAction(input: {
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  ticketId?: number;
}) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTicketsTableForClient(auth.session, input);
}

export async function loadOpenTicketsSnapshotAction() {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  const data = await loadOpenTicketsSnapshotForClient(auth.session);
  return { ok: true as const, ...data };
}

export async function loadHeaderStatsAction() {
  const auth = await requireSession();
  if (!auth.ok) return { error: auth.error };
  return loadHeaderStatsForClient(auth.session);
}

export async function loadTransactionsCreditFlowAction(days?: number) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTransactionsCreditFlowForClient(auth.session, days);
}

export async function loadTransactionsLedgerSummaryAction() {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTransactionsLedgerSummaryForClient(auth.session);
}

export async function loadTransactionsTableAction(input: {
  q?: string;
  type?: string;
  ledgerPreset?: string;
  page?: number;
  pageSize?: number;
  export?: boolean;
  includeAgg?: boolean;
}) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTransactionsTableForClient(auth.session, input);
}

export async function loadPortalStaffInboxAction() {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  const data = await loadPortalStaffInboxForClient(auth.session);
  return { ok: true as const, ...data };
}

export async function dismissPortalStaffMessageAction(recipientId: number) {
  const auth = await requireSession();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return dismissPortalStaffMessageForClient(recipientId, auth.session);
}

export async function markPortalStaffMessageReadAction(recipientId: number) {
  const auth = await requireSession();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return markPortalStaffMessageReadForClient(recipientId, auth.session);
}

export async function loadTicketChannelByNumberAction(channelNumber: number) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadTicketChannelByNumberForClient(channelNumber, auth.session);
}

export async function createTicketAction(input: CreateTicketClientInput) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return createTicketForClient(input, auth.session);
}

export async function loadMessageStalkerShellAction(variant: "admin" | "operator") {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return loadMessageStalkerShellForClient(auth.session, variant);
}

export async function updateStaffInlineAction(
  inlineApiPath: string,
  input: { rowType: string; username: string; field: string; value: string },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  const portal = parseStaffInlinePortal(inlineApiPath);
  if (!portal) return { ok: false as const, error: "bad_request", status: 400 };
  return updateStaffInlineForClient(portal, auth.session, input);
}

export async function updateUserInlineAction(
  inlineApiPath: string,
  input: { account: string; field: string; value: string },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  const portal = parseUserInlinePortal(inlineApiPath);
  if (!portal) return { ok: false as const, error: "bad_request", status: 400 };
  return updateUserInlineForClient(portal, auth.session, input);
}

export async function saveStaffEditorAction(editorApiBase: string, body: StaffEditorSaveBody) {
  const auth = await requireSession();
  if (!auth.ok) return { ok: false as const, error: auth.error, status: auth.status };
  return saveStaffEditorForClient(editorApiBaseToPortal(editorApiBase), body);
}

export async function uploadAnnouncementSlideAction(formData: FormData) {
  const auth = await requireSession();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "missing_file" };
  return uploadAnnouncementSlideForClient(file, auth.session);
}

export async function resolveClientPublicIpAction() {
  return resolveClientIpForClient();
}

export async function exportSubscribersCsvAction(scope: SubscribersExportScope, filters: SubscribersExportFilters) {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  return exportSubscribersCsvForClient(scope, auth.session, filters);
}
