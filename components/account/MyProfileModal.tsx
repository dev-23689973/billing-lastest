"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { PasswordInputWithToggle } from "@/components/forms/PasswordInputWithToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";
import { loadAccountProfileModalAction, saveAccountProfileModalAction } from "@/actions/modalData";

type ProfilePayload = {
  username: string;
  name: string;
  type: string;
  status: string;
  comments: string;
  usernameOwner: string | null;
  lastLoginTime: string;
  currentLoginTime: string;
  credits: number | null;
  ticketsEnabled: boolean | null;
  roleLabel: string;
  statusLabel: string;
};

function formatDbDateTime(raw: string): string {
  const s = raw.trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const sectionShell = cn(
  managersToolbarModalInsetPanelClass,
  "bg-background/50 p-2.5 dark:bg-[hsl(222_47%_8%/0.55)]",
);
const rowFieldClass = "gap-x-1.5 [grid-template-columns:6.5rem_minmax(0,1fr)]";

export function MyProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [name, setName] = useState("");
  const [comments, setComments] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadAccountProfileModalAction();
      if (!result.ok || !result.profile) throw new Error("load_failed");
      const data = result.profile;
      setProfile(data);
      setName(data.name);
      setComments(data.comments);
      setOldPassword("");
      setNewPassword("");
      setNewConfirm("");
    } catch {
      toast.error("Could not load your profile.");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, loadProfile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || saving) return;
    setSaving(true);
    try {
      const body = await saveAccountProfileModalAction({
        name: name.trim(),
        comments,
        oldPassword,
        newPassword,
        newConfirm,
      });
      if (!body.ok) {
        const code = body.error ?? "save_failed";
        const messages: Record<string, string> = {
          missing_name: "Display name is required.",
          old_len: "Current password must be 3–100 characters.",
          new_len: "New password must be 4–12 characters.",
          match: "New passwords do not match.",
          old: "Current password is incorrect.",
          save_failed: "Could not save profile.",
        };
        toast.error(messages[code] ?? "Could not save profile.");
        return;
      }
      if (body.passwordChanged) {
        toast.success("Profile saved. Sign in again with your new password.");
        window.location.href = "/login?ok=password";
        return;
      }
      toast.success("Profile updated.");
      onClose();
    } catch {
      toast.error("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[320] flex items-center justify-center p-2.5",
        managersToolbarModalBackdropClass,
        "bg-black/60 backdrop-blur-md dark:bg-black/55",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-profile-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative z-10 flex min-h-0 max-h-[92vh] w-full max-w-2xl flex-col overflow-visible",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay />
        <div className="relative z-[1] flex min-h-0 max-h-[inherit] w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-card/90 dark:bg-[hsl(222_47%_6%/0.94)]">
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 px-3.5 py-2 dark:border-b-cyan-400/10 sm:px-4 sm:py-2.5">
            <div>
              <h2 id="my-profile-title" className="text-base font-semibold tracking-tight text-foreground">
                My profile
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">View and update your account details.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {loading || !profile ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin opacity-70" aria-hidden />
              Loading profile…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1.5 sm:px-4 sm:pb-3.5">
                <div className="flex flex-col gap-1.5">
                  <section className={sectionShell}>
                    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Account</h3>
                    <div className="grid grid-cols-1 gap-1.5">
                      <FormField id="profile-name" label="Display name" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="profile-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          maxLength={120}
                          disabled={saving}
                        />
                      </FormField>
                      <FormField id="profile-username" label="Username" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="profile-username"
                          readOnly
                          value={profile.username}
                          className="font-mono text-muted-foreground"
                        />
                      </FormField>
                      <FormField id="profile-role" label="Role" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input id="profile-role" readOnly value={profile.roleLabel} className="text-muted-foreground" />
                      </FormField>
                      <FormField id="profile-status" label="Status" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input id="profile-status" readOnly value={profile.statusLabel} className="text-muted-foreground" />
                      </FormField>
                      {profile.usernameOwner ? (
                        <FormField id="profile-owner" label="Parent" density="compact" layout="horizontal" className={rowFieldClass}>
                          <Input
                            id="profile-owner"
                            readOnly
                            value={profile.usernameOwner}
                            className="font-mono text-muted-foreground"
                          />
                        </FormField>
                      ) : null}
                      {profile.credits != null ? (
                        <FormField id="profile-credits" label="Credits" density="compact" layout="horizontal" className={rowFieldClass}>
                          <Input
                            id="profile-credits"
                            readOnly
                            value={String(profile.credits)}
                            className="tabular-nums text-muted-foreground"
                          />
                        </FormField>
                      ) : null}
                      {profile.ticketsEnabled != null ? (
                        <FormField id="profile-tickets" label="Tickets" density="compact" layout="horizontal" className={rowFieldClass}>
                          <Input
                            id="profile-tickets"
                            readOnly
                            value={profile.ticketsEnabled ? "Enabled" : "Disabled"}
                            className="text-muted-foreground"
                          />
                        </FormField>
                      ) : null}
                    </div>
                  </section>

                  <section className={sectionShell}>
                    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Activity</h3>
                    <div className="grid grid-cols-1 gap-1.5">
                      <FormField id="profile-last-login" label="Last login" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="profile-last-login"
                          readOnly
                          value={formatDbDateTime(profile.lastLoginTime)}
                          className="text-muted-foreground"
                        />
                      </FormField>
                      <FormField id="profile-current-login" label="This session" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="profile-current-login"
                          readOnly
                          value={formatDbDateTime(profile.currentLoginTime)}
                          className="text-muted-foreground"
                        />
                      </FormField>
                    </div>
                  </section>

                  <section className={sectionShell}>
                    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Security</h3>
                    <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                      Leave password fields empty to keep your current password. After a password change you will be signed out.
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      <FormField id="profile-old-pw" label="Current" density="compact" layout="horizontal" className={rowFieldClass}>
                        <PasswordInputWithToggle
                          id="profile-old-pw"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          autoComplete="current-password"
                          disabled={saving}
                        />
                      </FormField>
                      <FormField
                        id="profile-new-pw"
                        label="New password"
                        hint="4–12 characters."
                        density="compact"
                        layout="horizontal"
                        className={rowFieldClass}
                      >
                        <PasswordInputWithToggle
                          id="profile-new-pw"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={saving}
                        />
                      </FormField>
                      <FormField id="profile-confirm-pw" label="Confirm" density="compact" layout="horizontal" className={rowFieldClass}>
                        <PasswordInputWithToggle
                          id="profile-confirm-pw"
                          value={newConfirm}
                          onChange={(e) => setNewConfirm(e.target.value)}
                          autoComplete="new-password"
                          disabled={saving}
                        />
                      </FormField>
                    </div>
                  </section>

                  <section className={sectionShell}>
                    <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
                    <label className="mb-0.5 block text-[11px] font-semibold text-muted-foreground" htmlFor="profile-comments">
                      Comments
                    </label>
                    <Textarea
                      id="profile-comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      disabled={saving}
                      className="min-h-[4.5rem]"
                      placeholder="Internal comments..."
                    />
                  </section>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-cyan-600/15 bg-inherit px-3 py-2 dark:border-t-cyan-400/10 sm:px-4">
                <Button type="button" variant="ctaLinkMuted" size="inline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" variant="ctaLink" size="inline" disabled={saving} className="gap-1">
                  {saving ? (
                    <>
                      Saving…
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-90" aria-hidden />
                    </>
                  ) : (
                    <>
                      Save profile
                      <Save className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
