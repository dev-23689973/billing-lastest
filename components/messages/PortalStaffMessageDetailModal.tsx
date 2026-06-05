"use client";

import { createPortal } from "react-dom";
import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { usePortalStaffMessages } from "@/components/messages/portal-staff-messages-context";
import { MessageModalShell } from "@/components/messages/MessageModalShell";
import {
  messageModalFooterDividerClass,
  messageModalGlassPanelClass,
  messageModalMetaPanelClass,
} from "@/components/messages/messageModalChrome";
import { StaffHudDashedButton, staffHudAccentGlassClass } from "@/components/admin/StaffHudDashedSubmitButton";
import type { PortalStaffInboxStatus, PortalStaffPendingMessage } from "@/lib/portalStaffInbox";
import { portalStaffMessageHeadline } from "@/lib/portalStaffMessageDisplay";
import { portalStaffInboxStatusLabel } from "@/lib/ui/portalStaffInboxStatus";
import { cn } from "@/lib/cn";

export function PortalStaffMessageDetailModal({
  message,
  inboxStatus,
  onClose,
  onDismissed,
}: {
  message: PortalStaffPendingMessage;
  inboxStatus: PortalStaffInboxStatus;
  onClose: () => void;
  onDismissed?: () => void;
}) {
  const { markRead } = usePortalStaffMessages();
  const [readAck, setReadAck] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending || inboxStatus === "read") return;
    startTransition(async () => {
      const ok =
        inboxStatus === "active" || inboxStatus === "dismiss"
          ? await markRead(message.recipientId)
          : false;
      if (!ok) return;
      onDismissed?.();
      onClose();
    });
  }

  const subtitleParts = [
    message.sentBy ? `From ${message.sentBy}` : "Administration",
    `${portalStaffInboxStatusLabel[inboxStatus]}`,
    inboxStatus === "read" && message.readAt
      ? message.readAt
      : inboxStatus === "dismiss" && message.dismissedAt
        ? message.dismissedAt
        : message.createdAt ?? "",
  ].filter(Boolean);

  const primaryLabel = inboxStatus === "active" || inboxStatus === "dismiss" ? "Mark as read" : null;

  const modalTitle = portalStaffMessageHeadline(message);
  const bodyText = message.body.trim();

  const modal = (
    <MessageModalShell
      titleId="portal-staff-message-modal-title"
      title={modalTitle}
      titleIcon={Megaphone}
      subtitle={subtitleParts.join(" · ")}
      onClose={onClose}
      appearance="solid"
      maxWidthClassName="max-w-lg"
      bodyScrollMaxHeightClassName="max-h-[min(88vh,28rem)]"
      zIndexClassName="z-[500]"
    >
      <div className="space-y-4">
        <div className={messageModalGlassPanelClass}>
          <p className="max-h-[min(50vh,18rem)] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {bodyText}
          </p>
        </div>
        {inboxStatus !== "read" ? (
          <div className={cn(messageModalMetaPanelClass, "px-3 py-3")}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-cyan-600 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                checked={readAck}
                onChange={(e) => setReadAck(e.target.checked)}
              />
              <span>
                I have read this message
              </span>
            </label>
          </div>
        ) : null}
        <div
          className={cn(
            "flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2",
            messageModalFooterDividerClass,
          )}
        >
          <StaffHudDashedButton type="button" variant="outline" onClick={onClose} disabled={pending}>
            Close
          </StaffHudDashedButton>
          {primaryLabel ? (
            <StaffHudDashedButton
              type="button"
              role="reseller"
              disabled={!readAck || pending}
              onClick={submit}
              title={!readAck ? "Confirm first" : undefined}
              className={cn("min-w-[9.5rem]", staffHudAccentGlassClass, !readAck && "opacity-50")}
            >
              {pending ? "Saving…" : primaryLabel}
            </StaffHudDashedButton>
          ) : null}
        </div>
      </div>
    </MessageModalShell>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
