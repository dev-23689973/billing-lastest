"use client";

import { Clock, FileText, Flag, Hash, MessageSquare, Radio, Type, User, UserCircle } from "lucide-react";
import type { AdminRecentStalkerSendMessageRow } from "@/lib/repos/billing";
import { MessageModalField, MessageModalShell } from "@/components/messages/MessageModalShell";
import {
  messageModalGlassPanelClass,
  messageModalMetaPanelClass,
  messageModalSectionLabelClass,
} from "@/components/messages/messageModalChrome";
import { cn } from "@/lib/cn";
import {
  stalkerMessageDeliveryStatusLabel,
  stalkerMessageDeliveryStatusPillClass,
} from "@/lib/ui/stalkerMessageDeliveryStatus";
import {
  stalkerMessagePriorityLabel,
  stalkerMessagePriorityPillClass,
} from "@/lib/ui/stalkerMessagePriority";

export function MessageDetailModal({
  row,
  sentByLabel,
  onClose,
}: {
  row: AdminRecentStalkerSendMessageRow;
  sentByLabel: string;
  onClose: () => void;
}) {
  const titlePreview = (row.title ?? "").trim();
  const preview = (row.msg ?? "").trim();

  return (
    <MessageModalShell
      titleId="message-detail-title"
      title="Message detail"
      titleIcon={MessageSquare}
      subtitle={
        <>
          Recipient <span className="font-semibold text-foreground/90">{row.login ?? "Unknown"}</span>
          {row.addtime ? (
            <>
              {" "}
              · <span className="tabular-nums">{row.addtime}</span>
            </>
          ) : null}
        </>
      }
      onClose={onClose}
      appearance="solid"
    >
      <div className="space-y-4">
        <div>
          <p className={messageModalSectionLabelClass}>Delivery details</p>
          <div className={cn("mt-2", messageModalMetaPanelClass)}>
            <div className="grid gap-2 sm:grid-cols-2">
              <MessageModalField icon={Hash} label="UID">
                <span className="font-mono text-sm tabular-nums">{row.uid}</span>
              </MessageModalField>
              <MessageModalField icon={User} label="Recipient">
                <span className="font-mono text-sm">{row.login ?? "—"}</span>
              </MessageModalField>
              <MessageModalField icon={Clock} label="Timestamp">
                <span className="text-sm tabular-nums">{row.addtime ?? "—"}</span>
              </MessageModalField>
              <MessageModalField icon={UserCircle} label="Sent by">
                {sentByLabel}
              </MessageModalField>
              <MessageModalField icon={Radio} label="Status">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    stalkerMessageDeliveryStatusPillClass(row.need_confirm),
                  )}
                >
                  {stalkerMessageDeliveryStatusLabel(row.need_confirm, { pendingLong: true })}
                </span>
              </MessageModalField>
              <MessageModalField icon={Flag} label="Priority">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    stalkerMessagePriorityPillClass(row.priority),
                  )}
                >
                  {stalkerMessagePriorityLabel(row.priority)}
                </span>
              </MessageModalField>
            </div>
          </div>
        </div>

        <div>
          <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
            <Type className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Message title
          </p>
          <div className={cn("mt-2", messageModalGlassPanelClass)}>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {titlePreview || "—"}
            </p>
          </div>
        </div>

        <div>
          <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Message body
          </p>
          <div className={cn("mt-2", messageModalGlassPanelClass)}>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {preview || "—"}
            </p>
          </div>
        </div>
      </div>
    </MessageModalShell>
  );
}
