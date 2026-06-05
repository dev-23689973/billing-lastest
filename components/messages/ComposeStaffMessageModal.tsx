"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Flag, MessageSquare, Send, Type, UserCheck, Users } from "lucide-react";
import { sendPortalStaffMessageAction } from "@/actions/forms";
import type { PortalStaffUserOption } from "@/lib/repos/portalStaffMessages";
import type { PortalStaffAudiencePreviewCounts } from "@/lib/repos/portalStaffMessages";
import { StaffHudDashedButton, staffHudAccentGlassClass } from "@/components/admin/StaffHudDashedSubmitButton";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/forms/form-select";
import type { ComposeChannel } from "@/components/messages/ComposeChannelTabs";
import { ComposeChannelTabs } from "@/components/messages/ComposeChannelTabs";
import { MessageModalField, MessageModalShell } from "@/components/messages/MessageModalShell";
import {
  messageModalGlassPanelClass,
  messageModalMetaPanelClass,
  messageComposeSelectContentClass,
  messageComposeSelectItemClass,
  messageComposeSelectTriggerClass,
  messageModalReadonlyInputClass,
  messageModalSendOptionsFieldClass,
  messageModalSendOptionsRowClass,
  messageModalComposeBodyScrollMaxHeightClass,
  messageModalComposeShellMaxHeightClass,
  messageModalFooterDividerClass,
  messageModalSectionLabelClass,
  messageModalTextareaClass,
  messageModalTextareaCompactClass,
  messageModalTitleInputClass,
} from "@/components/messages/messageModalChrome";
import { MessageRecipientPickerSection } from "@/components/messages/MessageRecipientPickerSection";
import { cn } from "@/lib/cn";
import { PORTAL_STAFF_MESSAGE_TITLE_MAX } from "@/lib/portalStaffMessageDisplay";

const MAX_MESSAGE_LEN = 500;

export type ComposeStaffAudience = "all_staff" | "managers" | "resellers" | "dealers" | "custom";

const STAFF_AUDIENCE_OPTIONS = [
  { value: "all_staff", label: "All staff" },
  { value: "managers", label: "Managers" },
  { value: "resellers", label: "Resellers" },
  { value: "dealers", label: "Dealers" },
  { value: "custom", label: "Custom staff" },
] as const;

const MESSAGE_PRIORITY_OPTIONS = [
  { value: "1", label: "High" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Low" },
] as const;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function staffTypeLabel(type: PortalStaffUserOption["type"]) {
  if (type === "MNGR") return "Manager";
  if (type === "SRSLR") return "Reseller";
  return "Dealer";
}

function ComposeFormActions({ onReset }: { onReset: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-2",
        messageModalFooterDividerClass,
      )}
    >
      <StaffHudDashedButton type="button" variant="outline" onClick={onReset} disabled={pending}>
        Reset
      </StaffHudDashedButton>
      <StaffHudDashedButton
        type="submit"
        role="reseller"
        disabled={pending}
        className={cn("min-w-[11rem]", staffHudAccentGlassClass)}
      >
        <Send className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        {pending ? "Sending…" : "Send to portal staff"}
      </StaffHudDashedButton>
    </div>
  );
}

export function ComposeStaffMessageModal({
  onClose,
  composeChannel,
  onComposeChannelChange,
  audience,
  onAudienceChange,
  priority,
  onPriorityChange,
  selected,
  onToggleUser,
  onApplySelection,
  onClearSelection,
  onLookupStaff,
  messageTitle,
  onMessageTitleChange,
  messageBody,
  onMessageBodyChange,
  onReset,
  onConfirmLargeSend,
  staffUsers,
  selectedCount,
  recipientPreviewCount,
  recipientSummaryReadOnly,
  staffAudiencePreview,
}: {
  onClose: () => void;
  composeChannel: ComposeChannel;
  onComposeChannelChange: (channel: ComposeChannel) => void;
  audience: ComposeStaffAudience;
  onAudienceChange: (audience: ComposeStaffAudience) => void;
  priority: string;
  onPriorityChange: (priority: string) => void;
  selected: Set<string>;
  onToggleUser: (username: string) => void;
  onApplySelection: (selected: Set<string>) => void;
  onClearSelection: () => void;
  onLookupStaff: () => void;
  messageTitle: string;
  onMessageTitleChange: (title: string) => void;
  messageBody: string;
  onMessageBodyChange: (body: string) => void;
  onReset: () => void;
  onConfirmLargeSend: (e: FormEvent<HTMLFormElement>) => void;
  staffUsers: PortalStaffUserOption[];
  selectedCount: number;
  recipientPreviewCount: number;
  recipientSummaryReadOnly: string;
  staffAudiencePreview: PortalStaffAudiencePreviewCounts;
}) {
  return (
    <MessageModalShell
      titleId="compose-staff-message-title"
      title="Compose — portal staff"
      titleIcon={MessageSquare}
      subtitle="Delivered in the header alerts bell (Messages tab) until dismissed."
      onClose={onClose}
      maxWidthClassName="max-w-[min(980px,96vw)]"
      maxHeightClassName={messageModalComposeShellMaxHeightClass}
      bodyScrollMaxHeightClassName={messageModalComposeBodyScrollMaxHeightClass}
      headerToolbar={<ComposeChannelTabs channel={composeChannel} onChannelChange={onComposeChannelChange} />}
    >
      <form action={sendPortalStaffMessageAction} onSubmit={onConfirmLargeSend} className="space-y-4">
        <div>
          <p className={messageModalSectionLabelClass}>Send options</p>
          <div className={cn("mt-2", messageModalMetaPanelClass)}>
            <div className={messageModalSendOptionsRowClass}>
              <MessageModalField bare icon={Users} label="Audience" className={messageModalSendOptionsFieldClass}>
                <FormSelect
                  id="staff-msg-audience"
                  name="audience"
                  value={audience}
                  onValueChange={(v) => onAudienceChange(v as ComposeStaffAudience)}
                  options={[...STAFF_AUDIENCE_OPTIONS]}
                  placeholder="Choose audience"
                  className={messageComposeSelectTriggerClass}
                  contentClassName={messageComposeSelectContentClass}
                  contentHudCorners
                  itemClassName={messageComposeSelectItemClass}
                  clampMenuToTrigger
                />
              </MessageModalField>
              <MessageModalField bare icon={Flag} label="Priority" className={messageModalSendOptionsFieldClass}>
                <FormSelect
                  id="staff-msg-priority"
                  name="priority"
                  value={priority}
                  onValueChange={onPriorityChange}
                  options={[...MESSAGE_PRIORITY_OPTIONS]}
                  className={messageComposeSelectTriggerClass}
                  contentClassName={messageComposeSelectContentClass}
                  contentHudCorners
                  itemClassName={messageComposeSelectItemClass}
                  clampMenuToTrigger
                />
              </MessageModalField>
              <MessageModalField bare icon={UserCheck} label="Reach" className={messageModalSendOptionsFieldClass}>
                <Input
                  id="staff-est-reach"
                  readOnly
                  value={formatInt(recipientPreviewCount)}
                  className={messageModalReadonlyInputClass}
                  title="Active billing portal users for this audience."
                />
              </MessageModalField>
            </div>
          </div>
        </div>

        {audience === "custom" ? (
          <MessageRecipientPickerSection
            pickerTitle="Select staff"
            pickerSubtitle="Choose portal staff usernames for this send."
            noSelectionHint="No staff selected yet"
            searchPlaceholder="Search by username or name..."
            onSearchEnter={onLookupStaff}
            pickItems={staffUsers.map((u) => ({
              id: u.username,
              label: u.username,
              meta: staffTypeLabel(u.type),
            }))}
            selected={selected}
            selectedCount={selectedCount}
            onToggle={onToggleUser}
            onApplySelection={onApplySelection}
            onClearSelection={onClearSelection}
            clearDisabled={!selectedCount}
            hiddenFields={[...selected].map((username) => (
              <input key={username} type="hidden" name="staff" value={username} />
            ))}
          />
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-1.5">
            <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
              <Type className="h-3.5 w-3.5 text-cyan-400/85" aria-hidden />
              Message title
            </p>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {messageTitle.length} / {PORTAL_STAFF_MESSAGE_TITLE_MAX}
            </span>
          </div>
          <div className={messageModalGlassPanelClass}>
            <Input
              id="admin-staff-msg-title"
              name="title"
              value={messageTitle}
              onChange={(e) => onMessageTitleChange(e.target.value)}
              maxLength={PORTAL_STAFF_MESSAGE_TITLE_MAX}
              placeholder="Short subject shown in the alerts bell…"
              className={messageModalTitleInputClass}
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-1.5">
            <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
              <FileText className="h-3.5 w-3.5 text-cyan-400/85" aria-hidden />
              Message body
            </p>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {messageBody.length} / {MAX_MESSAGE_LEN}
            </span>
          </div>
          <div className={messageModalGlassPanelClass}>
            <textarea
              id="admin-staff-msg-body"
              name="message"
              rows={audience === "custom" ? 4 : 5}
              maxLength={MAX_MESSAGE_LEN}
              value={messageBody}
              onChange={(e) => onMessageBodyChange(e.target.value)}
              placeholder="Write what staff should see in their alerts inbox..."
              className={audience === "custom" ? messageModalTextareaCompactClass : messageModalTextareaClass}
              required
            />
          </div>
        </div>

        <ComposeFormActions onReset={onReset} />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Active staff: {formatInt(staffAudiencePreview.all_staff)} total ({formatInt(staffAudiencePreview.managers)} managers,{" "}
          {formatInt(staffAudiencePreview.resellers)} resellers, {formatInt(staffAudiencePreview.dealers)} dealers). Each recipient must
          dismiss from the alerts bell before it clears.
        </p>
      </form>
    </MessageModalShell>
  );
}
