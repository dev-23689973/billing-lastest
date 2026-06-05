"use server";

import { stripClientPayload } from "@/lib/dto/redact";
import { loadEndUserDetailsForModal, loadEndUserTransactionsForModal, type EndUserModalScope } from "@/lib/server/endUserModalData";
import { loadHierarchyProfileForModal } from "@/lib/server/hierarchyModalData";
import {
  loadAccountProfileForModal,
  loadStaffBranchesForModal,
  loadStaffTransactionsForModal,
  loadSubscribersFetchModalPage,
  saveAccountProfileFromModal,
} from "@/lib/server/staffModalData";
import {
  loadStaffEditorForModal,
  type StaffEditorCreditsMode,
  type StaffEditorPortal,
  type StaffEditorSection,
  type StaffEditorType,
} from "@/lib/server/staffEditorModalData";
import {
  loadStaffCreateCreditPresets,
  type StaffCreateKind,
  type StaffCreatePortal,
} from "@/lib/server/staffCreateCreditPresets";
import { getSession } from "@/lib/session";

export async function loadStaffCreateCreditPresetsAction(input: {
  portal: StaffCreatePortal;
  kind: StaffCreateKind;
  payerUsername?: string;
  draftUsername?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { ok: false as const, error: "forbidden", status: 403 };
    const data = await loadStaffCreateCreditPresets({
      portal: input.portal,
      session,
      kind: input.kind,
      payerUsername: input.payerUsername,
      draftUsername: input.draftUsername,
    });
    return { ok: true as const, data: stripClientPayload(data) };
  } catch (err) {
    console.error("[loadStaffCreateCreditPresetsAction]", err);
    return { ok: false as const, error: "load_error", status: 500 };
  }
}

export async function loadStaffEditorModalAction(input: {
  portal: StaffEditorPortal;
  type: StaffEditorType;
  username: string;
  section?: StaffEditorSection;
  creditsMode?: StaffEditorCreditsMode;
}) {
  try {
    const session = await getSession();
    if (!session) return { ok: false as const, error: "forbidden", status: 403 };
    return stripClientPayload(
      await loadStaffEditorForModal({
        portal: input.portal,
        session,
        type: input.type,
        username: input.username,
        section: input.section ?? "all",
        creditsMode: input.creditsMode,
      }),
    );
  } catch (err) {
    console.error("[loadStaffEditorModalAction]", input.username, err);
    return { ok: false as const, error: "load_error", status: 500 };
  }
}

export async function loadEndUserDetailsModalAction(input: { scope: EndUserModalScope; account: string }) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadEndUserDetailsForModal(input.scope, input.account, session));
}

export async function loadEndUserTransactionsModalAction(input: { scope: EndUserModalScope; account: string }) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadEndUserTransactionsForModal(input.scope, input.account, session));
}

export async function loadHierarchyProfileModalAction(input: {
  scope: EndUserModalScope;
  role: "manager" | "reseller" | "dealer";
  username: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadHierarchyProfileForModal(input.scope, input.role, input.username, session));
}

export async function loadStaffTransactionsModalAction(input: {
  scope: import("@/lib/server/staffModalData").StaffTransactionsScope;
  username: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadStaffTransactionsForModal(input.scope, input.username, session));
}

export async function loadStaffBranchesModalAction(input: {
  portal: import("@/lib/server/staffModalData").StaffBranchesPortal;
  rowType: "MANAGER" | "RESELLER";
  username: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: "" | "active" | "inactive";
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(
    await loadStaffBranchesForModal(input.portal, input.rowType, input.username, session, {
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      status: input.status,
      sort: input.sort,
      dir: input.dir,
    }),
  );
}

export async function loadAccountProfileModalAction() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadAccountProfileForModal(session));
}

export async function saveAccountProfileModalAction(input: {
  name: string;
  comments: string;
  oldPassword: string;
  newPassword: string;
  newConfirm: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden" };
  return saveAccountProfileFromModal(session, input);
}

export async function loadSubscribersFetchModalAction(input: {
  apiBaseUrl: string;
  page: number;
  pageSize: number;
  query?: string;
  status?: "active" | "inactive" | "expired" | "expiring";
  fixedStatus?: "active" | "inactive" | "expired" | "expiring";
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadSubscribersFetchModalPage(session, input.apiBaseUrl, input));
}
