"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, MessageSquareText, X } from "lucide-react";
import { managersToolbarIconButtonClass, managersToolbarModalInsetPanelClass } from "@/components/admin/managers-toolbar-icon-button";
import { MessageModalShell } from "@/components/messages/MessageModalShell";
import {
  messageModalGlassPanelClass,
  messageModalSectionLabelClass,
  messageModalTextareaClass,
} from "@/components/messages/messageModalChrome";
import { Button } from "@/components/ui/button";
import {
  dismissTicketAlertAction,
  loadTicketCommentsAction,
  loadTicketPreviewAction,
  postTicketCommentAction,
} from "@/actions/clientData";
import { cn } from "@/lib/cn";
import type { TicketPreviewClientDto } from "@/lib/server/ticketsClientData";
import { dispatchTicketAlertDismissChanged } from "@/lib/realtime/ticket-alert-events";
import {
  ticketPriorityBadgeClass,
  ticketPriorityLabel,
  ticketStatusBadgeClass,
  ticketStatusLabel,
} from "@/lib/ui/ticketBadges";

async function postDismissTicketAlert(ticketId: number): Promise<boolean> {
  try {
    const j = await dismissTicketAlertAction(ticketId);
    return j.ok === true;
  } catch {
    return false;
  }
}

export type TicketConversationDetail = TicketPreviewClientDto;

type CommentRow = { id: number; html: string; author: string; updated_at: number };

function formatTicketTs(value: number) {
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toPlain(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function shorten(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function DetailCell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 bg-background/30 px-3 py-2.5 dark:bg-slate-950/35", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/90">{label}</p>
      <div className="mt-1 min-w-0 text-sm leading-snug text-foreground">{children}</div>
    </div>
  );
}

function TicketDetailsPanel({ ticket }: { ticket: TicketConversationDetail }) {
  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-border/50 shadow-sm", "dark:border-white/[0.08]")}
      aria-label="Ticket details"
    >
      <div className="border-b border-border/40 bg-muted/20 px-3 py-1.5 dark:bg-white/[0.04]">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
      </div>
      <div className="grid divide-y divide-border/40">
        <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:divide-y-0">
          <DetailCell label="Channel">
            <span className="block truncate font-medium">{ticket.channelName || "—"}</span>
          </DetailCell>
          <DetailCell label="Created by">
            <span className="block truncate font-medium">{ticket.creatorUsername || "—"}</span>
          </DetailCell>
          <DetailCell label="Agent">
            <span className="block truncate font-medium">{ticket.agentUsername || "—"}</span>
          </DetailCell>
          <DetailCell label="Status">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                ticketStatusBadgeClass(ticket.status_id),
              )}
            >
              {ticket.statusLabel || ticketStatusLabel(ticket.status_id)}
            </span>
          </DetailCell>
          <DetailCell label="Priority" className="sm:col-span-2 lg:col-span-1">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                ticketPriorityBadgeClass(ticket.priority_id),
              )}
            >
              {ticket.priorityLabel || ticketPriorityLabel(ticket.priority_id)}
            </span>
          </DetailCell>
        </div>
        <DetailCell label="Timeline">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-snug tabular-nums text-muted-foreground">
            <span>
              <span className="text-foreground/90">Created</span> {formatTicketTs(ticket.createdAt)}
            </span>
            <span className="hidden text-border/60 sm:inline" aria-hidden>
              ·
            </span>
            <span>
              <span className="text-foreground/90">Updated</span> {formatTicketTs(ticket.updatedAt)}
            </span>
          </p>
        </DetailCell>
        {ticket.categoryTitle ? (
          <DetailCell label="Category">
            <span className="font-medium">{ticket.categoryTitle}</span>
          </DetailCell>
        ) : null}
      </div>
    </section>
  );
}

/** Full ticket details + conversation + reply (header alerts and ticket queue). */
export function TicketConversationModal({
  ticketId,
  isAdminPortal = false,
  /** When true (opened from header bell), record `ticket_alert_dismissals` on close (after load) and after a successful reply. */
  dismissHeaderTicketAlert = false,
  onClose,
}: {
  ticketId: number;
  isAdminPortal?: boolean;
  dismissHeaderTicketAlert?: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TicketConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentsRows, setCommentsRows] = useState<CommentRow[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dismissedForBellRef = useRef(false);

  const dismissBellIfNeeded = useCallback(async () => {
    if (!dismissHeaderTicketAlert || dismissedForBellRef.current) return;
    const ok = await postDismissTicketAlert(ticketId);
    if (ok) {
      dismissedForBellRef.current = true;
      dispatchTicketAlertDismissChanged();
    }
  }, [dismissHeaderTicketAlert, ticketId]);

  const handleClose = useCallback(() => {
    if (dismissHeaderTicketAlert && detail && !error) {
      void dismissBellIfNeeded();
    }
    onClose();
  }, [detail, dismissBellIfNeeded, dismissHeaderTicketAlert, error, onClose]);

  const isTicketFixed = (statusId: number) => statusId === 2;
  const canReply = isAdminPortal || (detail != null && !isTicketFixed(detail.status_id));

  const loadComments = useCallback(async (id: number) => {
    const data = await loadTicketCommentsAction(id);
    if (!data.ok) throw new Error("comments_failed");
    setCommentsRows(Array.isArray(data.comments) ? data.comments : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setCommentsLoading(true);
    setCommentsError("");
    setReplyText("");
    setReplyError("");

    loadTicketPreviewAction(ticketId)
      .then(async (result) => {
        if (!result.ok) throw new Error("preview_failed");
        return result.data;
      })
      .then(async (data) => {
        if (cancelled) return;
        setDetail(data);
        setLoading(false);
        try {
          await loadComments(ticketId);
        } catch {
          if (!cancelled) {
            setCommentsRows([]);
            setCommentsError("Could not load comments for this ticket.");
          }
        } finally {
          if (!cancelled) setCommentsLoading(false);
        }
        if (!cancelled && (isAdminPortal || !isTicketFixed(data.status_id))) {
          requestAnimationFrame(() => replyTextareaRef.current?.focus());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
          setCommentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminPortal, loadComments, ticketId]);

  useEffect(() => {
    dismissedForBellRef.current = false;
  }, [ticketId]);

  async function submitReply() {
    if (!detail) return;
    if (!isAdminPortal && isTicketFixed(detail.status_id)) {
      setReplyError("This ticket is fixed. Reopen it before replying.");
      return;
    }
    const comment = replyText.trim();
    if (!comment) {
      setReplyError("Please write a reply.");
      return;
    }
    setReplyBusy(true);
    setReplyError("");
    try {
      const result = await postTicketCommentAction(ticketId, comment);
      if (!result.ok) throw new Error("reply_failed");
      setReplyText("");
      await loadComments(ticketId);
      if (dismissHeaderTicketAlert) await dismissBellIfNeeded();
    } catch {
      setReplyError("Could not send reply. Please try again.");
    } finally {
      setReplyBusy(false);
    }
  }

  const description = detail?.content || (detail?.html ? toPlain(detail.html) : "");

  const modal = (
    <MessageModalShell
      title={`Ticket #${ticketId} details`}
      titleIcon={MessageSquareText}
      subtitle={detail?.subject || "—"}
      titleId="alert-ticket-conversation-title"
      onClose={handleClose}
      maxWidthClassName="max-w-4xl"
      maxHeightClassName="max-h-[min(92vh,880px)]"
      bodyScrollMaxHeightClassName="max-h-[calc(min(92vh,880px)-4.5rem)]"
      zIndexClassName="z-[500]"
      headerToolbar={
        <button
          type="button"
          onClick={handleClose}
          className={managersToolbarIconButtonClass}
          aria-label="Close ticket details"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      }
    >
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading ticket…</p>
      ) : error || !detail ? (
        <p className="py-12 text-center text-sm text-destructive">Could not load this ticket.</p>
      ) : (
        <div className="space-y-5">
          <TicketDetailsPanel ticket={detail} />

          {description ? (
            <div>
              <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Description
              </p>
              <div className={cn("mt-2", messageModalGlassPanelClass)}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{description}</p>
              </div>
            </div>
          ) : null}

          <div>
            <p className={messageModalSectionLabelClass}>Conversation</p>
            {commentsLoading ? (
              <div className={cn("mt-2 space-y-2", messageModalGlassPanelClass)}>
                <p className="text-sm text-muted-foreground">Loading replies…</p>
                <div className="h-10 animate-pulse rounded-md bg-muted/40" />
              </div>
            ) : null}
            {!commentsLoading && commentsError ? (
              <p className="mt-2 text-sm text-destructive">{commentsError}</p>
            ) : null}
            {!commentsLoading && !commentsError && commentsRows.length === 0 ? (
              <div className={cn("mt-2 text-sm text-muted-foreground", messageModalGlassPanelClass)}>
                No replies yet. Be the first to respond below.
              </div>
            ) : null}
            {!commentsLoading && !commentsError && commentsRows.length > 0 ? (
              <div className={cn("mt-2 overflow-hidden p-0", messageModalGlassPanelClass)}>
                <div className="thin-scrollbar max-h-[36vh] overflow-y-auto overflow-x-hidden">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                      <col className="w-[7rem]" />
                      <col />
                      <col className="w-[8.5rem]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                          Author
                        </th>
                        <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                          Message
                        </th>
                        <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                          Sent
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {commentsRows.map((c) => (
                        <tr key={c.id} className="border-t border-border/40 align-top">
                          <td className="max-w-0 px-3 py-2.5">
                            <span className="block truncate text-sm font-medium text-foreground">{c.author}</span>
                          </td>
                          <td className="max-w-0 px-3 py-2.5 text-sm text-foreground" title={toPlain(c.html)}>
                            <span className="block truncate">{shorten(toPlain(c.html))}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                            {formatTicketTs(c.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {canReply ? (
            <div className={cn(managersToolbarModalInsetPanelClass, "p-4 sm:p-5")}>
              <p className={cn("mb-3", messageModalSectionLabelClass)}>Your reply</p>
              <textarea
                ref={replyTextareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Write your reply…"
                className={messageModalTextareaClass}
              />
              {replyError ? <p className="mt-2 text-xs text-destructive">{replyError}</p> : null}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyText("")}
                  disabled={replyBusy || !replyText.trim()}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void submitReply()}
                  disabled={replyBusy || !replyText.trim()}
                >
                  {replyBusy ? "Sending…" : "Reply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className={cn("p-3 text-sm text-muted-foreground", messageModalGlassPanelClass)}>
              This ticket is fixed. Reopen it to add a reply.
            </div>
          )}
        </div>
      )}
    </MessageModalShell>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
