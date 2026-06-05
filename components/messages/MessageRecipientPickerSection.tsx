"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { MessageRecipientsModal } from "@/components/messages/MessageRecipientsModal";
import { type MessageRecipientPickItem } from "@/components/messages/MessageRecipientPickList";
import { messageModalSectionLabelClass } from "@/components/messages/messageModalChrome";
import { cn } from "@/lib/cn";

function RecipientChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <li className="inline-flex max-w-full items-center gap-1 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-foreground">
      <span className="min-w-0 truncate font-mono">{label}</span>
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-background/80 hover:text-foreground"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </li>
  );
}

export function MessageRecipientPickerSection({
  sectionTitle = "Recipients",
  pickerTitle,
  pickerSubtitle,
  noSelectionHint,
  searchPlaceholder,
  onSearchEnter,
  pickItems,
  selected,
  selectedCount,
  onToggle,
  onApplySelection,
  onClearSelection,
  clearDisabled,
  emptyPanel,
  emptyListMessage,
  hiddenFields,
}: {
  sectionTitle?: string;
  pickerTitle: string;
  pickerSubtitle?: string;
  noSelectionHint?: string;
  searchPlaceholder: string;
  onSearchEnter?: () => void;
  pickItems: MessageRecipientPickItem[];
  selected: Set<string>;
  selectedCount: number;
  onToggle: (id: string) => void;
  onApplySelection: (selected: Set<string>) => void;
  onClearSelection: () => void;
  clearDisabled?: boolean;
  emptyPanel?: ReactNode;
  emptyListMessage?: string;
  hiddenFields?: ReactNode;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const labelById = useMemo(() => new Map(pickItems.map((item) => [item.id, item.label])), [pickItems]);
  const selectedItems = useMemo(
    () =>
      [...selected].map((id) => ({
        id,
        label: labelById.get(id) ?? id,
      })),
    [selected, labelById],
  );

  const emptyHint = noSelectionHint ?? `No ${pickerTitle.toLowerCase()} yet`;

  return (
    <div>
      <p className={messageModalSectionLabelClass}>{sectionTitle}</p>
      <div className="mt-2 space-y-2">
        {emptyPanel ? (
          emptyPanel
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">{pickerTitle}</p>
                {selectedCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    onClick={onClearSelection}
                    disabled={clearDisabled}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              {selectedCount === 0 ? (
                <p className="text-xs text-muted-foreground">{emptyHint}</p>
              ) : (
                <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label={`Selected ${pickerTitle.toLowerCase()}`}>
                  {selectedItems.map((item) => (
                    <RecipientChip key={item.id} label={item.label} onRemove={() => onToggle(item.id)} />
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={cn(
                "flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed",
                "border-primary/35 bg-primary/[0.04] text-primary hover:border-primary/55 hover:bg-primary/[0.08]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "px-4 py-4 text-sm",
              )}
            >
              <Plus className="h-5 w-5 shrink-0 stroke-[2.5]" aria-hidden />
              <span className="font-semibold">{pickerTitle}</span>
              {selectedCount > 0 ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums">
                  {selectedCount}
                </span>
              ) : null}
            </button>

            {modalOpen ? (
              <MessageRecipientsModal
                open
                onOpenChange={setModalOpen}
                title={pickerTitle}
                subtitle={pickerSubtitle}
                pickItems={pickItems}
                initialSelected={selected}
                onApply={onApplySelection}
                searchPlaceholder={searchPlaceholder}
                onSearchEnter={onSearchEnter ? () => onSearchEnter() : undefined}
                emptyListMessage={emptyListMessage}
              />
            ) : null}
          </>
        )}
        {hiddenFields}
      </div>
    </div>
  );
}
