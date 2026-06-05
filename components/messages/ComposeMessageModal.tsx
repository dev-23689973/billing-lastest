"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Flag, MessageSquare, Send, Type, UserCheck, Users } from "lucide-react";
import { sendMessageAction, sendOperatorPortalMessageAction } from "@/actions/forms";
import type { BillingSubscriberMessageOption } from "@/lib/repos/portalStaffMessages";
import { Alert } from "@/components/ui/alert";
import { StaffHudDashedButton, staffHudAccentGlassClass } from "@/components/admin/StaffHudDashedSubmitButton";
import { buttonOutlineLinkClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect, type FormSelectOption } from "@/components/forms/form-select";
import type { AdminMessageAudiencePreviewCounts } from "@/lib/repos/billing";
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

export type ComposeMessageAudience = "all" | "active" | "expired" | "expiring" | "inactive" | "custom";

const MESSAGE_AUDIENCE_OPTIONS = [
  { value: "all", label: "All users (billing accounts → STB)" },
  { value: "active", label: "Active subscribers" },
  { value: "inactive", label: "Inactive subscribers" },
  { value: "expired", label: "Expired subscribers" },
  { value: "expiring", label: "Expiring in 7 days" },
  { value: "custom", label: "Custom users (billing accounts)" },
] as const;

const PORTAL_MESSAGE_AUDIENCE_DEFS: {
  value: ComposeMessageAudience;
  label: string;
  countKey: keyof AdminMessageAudiencePreviewCounts;
}[] = [
  { value: "all", label: "All users (your hierarchy)", countKey: "all" },
  { value: "active", label: "Active subscribers", countKey: "active" },
  { value: "inactive", label: "Inactive subscribers", countKey: "inactive" },
  { value: "expired", label: "Expired subscribers", countKey: "expired" },
  { value: "expiring", label: "Expiring in 7 days", countKey: "expiring" },
  { value: "custom", label: "Select customers", countKey: "all" },
];

function buildPortalAudienceOptions(preview: AdminMessageAudiencePreviewCounts): FormSelectOption[] {
  return PORTAL_MESSAGE_AUDIENCE_DEFS.map(({ value, label, countKey }) => {
    const count = value === "custom" ? preview.all : preview[countKey];
    const disabled = value !== "custom" && count === 0;
    return {
      value,
      label: disabled ? `${label} (0)` : label,
      disabled,
    };
  });
}

const MESSAGE_PRIORITY_OPTIONS = [
  { value: "1", label: "High" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Low" },
] as const;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function ComposeFormActions({ onReset }: { onReset: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-2",
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
        className={cn("min-w-[9.5rem]", staffHudAccentGlassClass)}
      >
        <Send className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        {pending ? "Sending…" : "Send to STB"}
      </StaffHudDashedButton>
    </div>
  );
}

export function ComposeMessageModal({
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
  onLookupCustomer,
  messageTitle,
  onMessageTitleChange,
  messageBody,
  onMessageBodyChange,
  onReset,
  onConfirmLargeSend,
  subscriberAccounts,
  selectedCount,
  recipientPreviewCount,
  recipientSummaryReadOnly,
  portalMode = false,
  showStaffChannel = true,
  audiencePreview,
}: {
  onClose: () => void;
  composeChannel: ComposeChannel;
  onComposeChannelChange: (channel: ComposeChannel) => void;
  audience: ComposeMessageAudience;
  onAudienceChange: (audience: ComposeMessageAudience) => void;
  portalMode?: boolean;
  showStaffChannel?: boolean;
  audiencePreview?: AdminMessageAudiencePreviewCounts;
  priority: string;
  onPriorityChange: (priority: string) => void;
  selected: Set<string>;
  onToggleUser: (account: string) => void;
  onApplySelection: (selected: Set<string>) => void;
  onClearSelection: () => void;
  onLookupCustomer: () => void;
  messageTitle: string;
  onMessageTitleChange: (title: string) => void;
  messageBody: string;
  onMessageBodyChange: (body: string) => void;
  onReset: () => void;
  onConfirmLargeSend: (e: FormEvent<HTMLFormElement>) => void;
  subscriberAccounts: BillingSubscriberMessageOption[];
  selectedCount: number;
  recipientPreviewCount: number;
  recipientSummaryReadOnly: string;
}) {
  const audienceOptions = portalMode
    ? buildPortalAudienceOptions(audiencePreview ?? { all: 0, active: 0, expired: 0, expiring: 0, inactive: 0 })
    : MESSAGE_AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  const formAction = portalMode ? sendOperatorPortalMessageAction : sendMessageAction;

  return (
    <MessageModalShell
      titleId="compose-message-modal-title"
      title="Compose — subscribers (STB)"
      titleIcon={MessageSquare}
      subtitle="Delivered to the device on its next check-in."
      onClose={onClose}
      maxWidthClassName="max-w-[min(980px,96vw)]"
      maxHeightClassName={messageModalComposeShellMaxHeightClass}
      bodyScrollMaxHeightClassName={messageModalComposeBodyScrollMaxHeightClass}
      headerToolbar={
        <ComposeChannelTabs
          channel={composeChannel}
          onChannelChange={onComposeChannelChange}
          showStaffChannel={showStaffChannel}
        />
      }
    >
      <form action={formAction} onSubmit={onConfirmLargeSend} className="space-y-4">
        <div>
          <p className={messageModalSectionLabelClass}>Send options</p>
          <div className={cn("mt-2", messageModalMetaPanelClass)}>
            <div className={messageModalSendOptionsRowClass}>
              <MessageModalField bare icon={Users} label="Audience" className={messageModalSendOptionsFieldClass}>
                <FormSelect
                  id="msg-audience"
                  name="audience"
                  value={audience}
                  onValueChange={(v) => onAudienceChange(v as ComposeMessageAudience)}
                  options={audienceOptions}
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
                  id="msg-priority"
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
                  id="est-reach"
                  readOnly
                  value={formatInt(recipientPreviewCount)}
                  className={messageModalReadonlyInputClass}
                  title="Approximate recipients for this audience (billing rows or hand-picked count)."
                />
              </MessageModalField>
            </div>
          </div>
        </div>

        {audience === "custom" ? (
          <MessageRecipientPickerSection
            pickerTitle="Select customers"
            pickerSubtitle={
              portalMode
                ? "Choose customer logins in your hierarchy for this send."
                : "Choose billing accounts mapped to STB devices for this send."
            }
            noSelectionHint="No customers selected yet"
            searchPlaceholder={portalMode ? "Search customer login..." : "Search billing account login..."}
            onSearchEnter={onLookupCustomer}
            pickItems={subscriberAccounts.map((u) => ({ id: u.account, label: u.account }))}
            selected={selected}
            selectedCount={selectedCount}
            onToggle={onToggleUser}
            onApplySelection={onApplySelection}
            onClearSelection={onClearSelection}
            clearDisabled={!selectedCount}
            emptyPanel={
              !subscriberAccounts.length ? (
                <Alert>
                  {portalMode
                    ? "No customers in your hierarchy for custom selection. Broadcast still targets all users under your access."
                    : "No billing accounts loaded for custom selection. Broadcast audiences still work."}
                </Alert>
              ) : undefined
            }
            hiddenFields={[...selected].map((account) => (
              <input key={account} type="hidden" name={portalMode ? "users" : "accounts"} value={account} />
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
              id="admin-msg-title"
              name="title"
              value={messageTitle}
              onChange={(e) => onMessageTitleChange(e.target.value)}
              maxLength={PORTAL_STAFF_MESSAGE_TITLE_MAX}
              placeholder="Short subject shown on the STB screen…"
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
              id="admin-msg-body"
              name="message"
              rows={audience === "custom" ? 4 : 5}
              maxLength={MAX_MESSAGE_LEN}
              value={messageBody}
              onChange={(e) => onMessageBodyChange(e.target.value)}
              placeholder="Write what users should see on screen..."
              className={audience === "custom" ? messageModalTextareaCompactClass : messageModalTextareaClass}
              required
            />
          </div>
        </div>

        <ComposeFormActions onReset={onReset} />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {portalMode ? (
            <>Messages are delivered to set-top boxes in your hierarchy on their next check-in. Large sends require confirmation.</>
          ) : (
            <>
              Messages are delivered on the next device check-in. Only subscribers linked to a device profile receive the
              message. Large sends require confirmation.
            </>
          )}
        </p>
      </form>
    </MessageModalShell>
  );
}
