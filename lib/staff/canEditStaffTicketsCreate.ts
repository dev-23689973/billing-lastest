import type { StaffEditorPortal } from "@/lib/server/staffEditorModalData";

/** Per-user `users.tickets_enable` is assignable only from ROOT admin staff UIs/APIs. */
export function canEditStaffTicketsCreatePermission(portal: StaffEditorPortal | "admin" | "manager" | "reseller"): boolean {
  return portal === "admin";
}
