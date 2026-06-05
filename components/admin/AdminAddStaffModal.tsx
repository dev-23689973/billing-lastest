"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  Ticket,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { CSSProperties, RefObject } from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createManagerDealerAction, createManagerResellerAction, createResellerDealerAction } from "@/actions/forms";
import { saveManagerAction, saveResellerAction, saveDealerAction } from "@/actions/staff";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StaffHudDashedSubmitButton } from "@/components/admin/StaffHudDashedSubmitButton";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  managersToolbarIconButtonClass,
  managersToolbarPrimaryButtonClass,
  managersToolbarModalShellClass,
  managersToolbarSearchInputClass,
  managersToolbarSearchableDropdownItemClass,
  managersToolbarSearchableDropdownListBoxClass,
  managersToolbarSearchableDropdownListClass,
  managersToolbarSearchableDropdownScrollFillClass,
} from "@/components/admin/managers-toolbar-icon-button";
import {
  OPERATOR_ROLE_ICON_CLASS,
  OPERATOR_ROLE_SEGMENT_ACTIVE_CLASS,
  OPERATOR_ROLE_SEGMENT_IDLE_HOVER_CLASS,
  type OperatorRole,
} from "@/components/dashboard/operatorRoleColors";
import { StaffAddCredentialBlock } from "@/components/forms/StaffAddCredentialBlock";
import { StaffCreateInitialCreditsBlock } from "@/components/admin/StaffCreateInitialCreditsBlock";
import type { StaffCreatePortal } from "@/lib/server/staffCreateCreditPresets";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { DialogLayerToaster } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";
import { computeComboDropdownPanelPosInContainer } from "@/lib/client/comboDropdownPanel";

/** Same faint cyan edge + inset as toolbar / column dropdowns. */
const addStaffShellInset = "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]";

const addStaffInputClass = cn(
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "bg-white text-foreground shadow-none ring-offset-0",
  "dark:bg-[hsl(222_47%_8%)]",
  /* Override Chrome autofill yellow/blue so saved values match the dark panel. */
  "[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(24_24_27)]",
  "dark:[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(244_244_245)]",
  "[&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_rgb(252_252_252)]",
  "dark:[&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_hsl(222_47%_8%)]",
  "[&:-webkit-autofill]:[transition:background-color_99999s_ease-out]",
);

/** Manager / reseller picker search — same left gutter as resellers toolbar (`pl-8 sm:pl-9`). */
const addStaffComboSearchInputClass = cn(managersToolbarSearchInputClass, addStaffInputClass);

const addStaffPasswordInputClass = cn(addStaffInputClass, "pr-10 sm:pr-10");

const addStaffComboSearchIconClass =
  "pointer-events-none absolute left-2 top-1/2 z-[2] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-2.5";

/** Portaled suggestion list: inset content from panel border (search field stays outside). */
const addStaffPickerSurfaceClass = cn("p-2 shadow-xl", managersToolbarDropdownPanelClass);

/** Visual separation around the search + suggestions anchor (list renders in a portal). */
const addStaffComboShellClass = cn(
  "my-1 rounded-md border border-cyan-600/22 bg-muted/15 p-2 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.05)] dark:border-cyan-400/14 dark:bg-[hsl(222_47%_9%/0.5)]",
  managersToolbarGreyBorder,
);

const pickerRowBtnClass = managersToolbarSearchableDropdownItemClass;

const addStaffDividerClass = "border-t border-cyan-600/15 dark:border-t-cyan-400/10";

const addStaffFieldRowClass =
  "grid grid-cols-1 gap-x-2.5 gap-y-1 sm:grid-cols-[minmax(7.75rem,9rem)_1fr] sm:items-center";

function segmentActiveClass(role: OperatorRole) {
  return cn(managersToolbarGreyBorder, OPERATOR_ROLE_SEGMENT_ACTIVE_CLASS[role]);
}

function segmentIdleClass(role: OperatorRole) {
  return cn(
    "border-transparent bg-transparent text-muted-foreground",
    OPERATOR_ROLE_SEGMENT_IDLE_HOVER_CLASS[role],
  );
}

const pickerOptionIdleClass = "bg-transparent hover:bg-primary/10";

const segmentedShellClass = cn(
  "grid gap-1 rounded-none bg-muted/25 p-0.5 dark:bg-[hsl(222_47%_9%)]",
  managersToolbarGreyBorder,
  addStaffShellInset,
);

function StaffPickerPortal({
  open,
  anchorRef,
  containerRef,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  /** Must be the open `<dialog>` so the list stays in the modal top layer (not behind `showModal()`). */
  containerRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<CSSProperties>({});

  const reposition = useCallback(() => {
    const container = containerRef.current;
    const anchor = anchorRef.current;
    if (!container || !anchor || !open) return;
    const panel = computeComboDropdownPanelPosInContainer(anchor, container, {
      gap: 8,
      margin: 8,
      minHeight: 120,
      preferredMaxHeight: 240,
    });
    setPos({
      position: "absolute",
      top: panel.top,
      left: panel.left,
      width: panel.width,
      maxHeight: panel.maxHeight,
      zIndex: 80,
    });
  }, [anchorRef, containerRef, open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setRootEl(null), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setRootEl(containerRef.current), 0);
    return () => window.clearTimeout(timer);
  }, [open, containerRef]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const raf = requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  if (!mounted || !open || !rootEl) return null;

  return createPortal(
    <div
      className={cn(addStaffPickerSurfaceClass, "box-border flex min-h-0 flex-col overflow-hidden")}
      style={pos}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={cn(managersToolbarSearchableDropdownListBoxClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        <div
          className={cn(
            managersToolbarSearchableDropdownListClass,
            managersToolbarSearchableDropdownScrollFillClass,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    rootEl,
  );
}

function StaffField({
  htmlFor,
  label,
  icon: Icon,
  accentRole,
  children,
  hint,
}: {
  htmlFor: string;
  label: string;
  icon: LucideIcon;
  accentRole: OperatorRole;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className={addStaffFieldRowClass}>
      <div className="flex min-h-8 items-center gap-1.5 sm:min-h-0">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", OPERATOR_ROLE_ICON_CLASS[accentRole])} strokeWidth={2} aria-hidden />
        <Label htmlFor={htmlFor} className="text-xs font-medium leading-tight text-foreground sm:text-sm">
          {label}
        </Label>
      </div>
      <div className="min-w-0 space-y-0.5">
        {children}
        {hint}
      </div>
    </div>
  );
}

export type AdminAddStaffOption = { value: string; label: string };

export type StaffKind = "manager" | "reseller" | "dealer";

const ALL_STAFF_KINDS: StaffKind[] = ["manager", "reseller", "dealer"];
const MANAGER_PORTAL_KINDS: StaffKind[] = ["reseller", "dealer"];
const RESELLER_PORTAL_KINDS: StaffKind[] = ["dealer"];

function PasswordFieldWithToggle({
  id,
  name,
  required = false,
  onInput,
  className,
}: {
  id: string;
  name: string;
  required?: boolean;
  onInput?: React.FormEventHandler<HTMLInputElement>;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        onInput={onInput}
        className={cn(addStaffPasswordInputClass, className)}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors",
          "border-transparent hover:border-cyan-500/32 hover:bg-muted/40 hover:text-foreground dark:hover:border-cyan-300/22",
        )}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

export function AdminAddStaffModal({
  managerOptions = [],
  resellerOptions = [],
  triggerClassName,
  iconOnlyTrigger = false,
  portal = "admin",
  allowedKinds,
  triggerLabel,
}: {
  managerOptions?: AdminAddStaffOption[];
  resellerOptions?: AdminAddStaffOption[];
  triggerClassName?: string;
  iconOnlyTrigger?: boolean;
  portal?: "admin" | "manager" | "reseller";
  allowedKinds?: StaffKind[];
  /** Toolbar label when not using icon-only trigger (manager hub uses "Add user"). */
  triggerLabel?: string;
}) {
  const isManagerPortal = portal === "manager";
  const isResellerPortal = portal === "reseller";
  const kinds = allowedKinds ?? (isResellerPortal ? RESELLER_PORTAL_KINDS : isManagerPortal ? MANAGER_PORTAL_KINDS : ALL_STAFF_KINDS);
  const defaultKind = kinds[0] ?? "reseller";
  const singleKind = kinds.length === 1;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [kind, setKind] = useState<StaffKind>(defaultKind);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerSelectedUsername, setManagerSelectedUsername] = useState("");
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const [resellerSearch, setResellerSearch] = useState("");
  const [resellerSelectedUsername, setResellerSelectedUsername] = useState("");
  const [resellerPickerOpen, setResellerPickerOpen] = useState(false);
  const [dealerTicketsManager, setDealerTicketsManager] = useState<"No" | "Yes">("No");
  const [mgrDraftUsername, setMgrDraftUsername] = useState("");
  const [resDraftUsername, setResDraftUsername] = useState("");
  const [dlrDraftUsername, setDlrDraftUsername] = useState("");
  const [creditsValid, setCreditsValid] = useState(false);
  const managerAnchorRef = useRef<HTMLDivElement>(null);
  const resellerAnchorRef = useRef<HTMLDivElement>(null);

  const createPortal: StaffCreatePortal = portal;

  const creditsPayerUsername =
    kind === "reseller" && !isManagerPortal
      ? managerSelectedUsername
      : kind === "dealer" && !isResellerPortal
        ? resellerSelectedUsername
        : "";

  useEffect(() => {
    setCreditsValid(false);
  }, [kind, creditsPayerUsername]);

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    setKind((current) => (kinds.includes(current) ? current : defaultKind));
    d.showModal();
    setDialogOpen(true);
  }, [defaultKind, kinds]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onDialogClose = () => setDialogOpen(false);
    d.addEventListener("close", onDialogClose);
    return () => d.removeEventListener("close", onDialogClose);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  const onBackdropMouseDown = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  const filteredManagerOptions = useMemo(() => {
    const q = managerSearch.trim().toLowerCase();
    if (!q) return managerOptions;
    return managerOptions
      .filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      .slice(0, 8);
  }, [managerOptions, managerSearch]);

  const filteredResellerOptions = useMemo(() => {
    const q = resellerSearch.trim().toLowerCase();
    if (!q) return resellerOptions;
    return resellerOptions
      .filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      .slice(0, 8);
  }, [resellerOptions, resellerSearch]);

  const syncManagerSelectionFromSearch = useCallback(
    (nextRaw: string) => {
      const next = nextRaw.trim().toLowerCase();
      if (!next) {
        setManagerSelectedUsername("");
        return;
      }
      const match = managerOptions.find((o) => o.label.toLowerCase() === next || o.value.toLowerCase() === next);
      setManagerSelectedUsername(match?.value ?? "");
    },
    [managerOptions],
  );

  const syncResellerSelectionFromSearch = useCallback(
    (nextRaw: string) => {
      const next = nextRaw.trim().toLowerCase();
      if (!next) {
        setResellerSelectedUsername("");
        return;
      }
      const match = resellerOptions.find((o) => o.label.toLowerCase() === next || o.value.toLowerCase() === next);
      setResellerSelectedUsername(match?.value ?? "");
    },
    [resellerOptions],
  );

  const handleManagerSearchChange = useCallback(
    (nextRaw: string) => {
      setManagerSearch(nextRaw);
      syncManagerSelectionFromSearch(nextRaw);
      setManagerPickerOpen(true);
    },
    [syncManagerSelectionFromSearch],
  );

  const handleResellerSearchChange = useCallback(
    (nextRaw: string) => {
      setResellerSearch(nextRaw);
      syncResellerSelectionFromSearch(nextRaw);
      setResellerPickerOpen(true);
    },
    [syncResellerSelectionFromSearch],
  );

  const selectManagerOption = useCallback((value: string, label: string) => {
    setManagerSelectedUsername(value);
    setManagerSearch(label);
    setManagerPickerOpen(false);
  }, []);

  const selectResellerOption = useCallback((value: string, label: string) => {
    setResellerSelectedUsername(value);
    setResellerSearch(label);
    setResellerPickerOpen(false);
  }, []);

  const validateCreateStaffPasswords = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;
    const confirmInput = form.elements.namedItem("password_confirm") as HTMLInputElement | null;
    if (!passwordInput || !confirmInput) return;
    confirmInput.setCustomValidity("");
    if (passwordInput.value !== confirmInput.value) {
      confirmInput.setCustomValidity("Passwords do not match.");
      confirmInput.reportValidity();
      e.preventDefault();
    }
  }, []);

  const triggerAriaLabel =
    triggerLabel ?? (isResellerPortal ? "Add dealer" : isManagerPortal ? "Add staff" : "Add staff");
  const TriggerIcon = isResellerPortal ? Building2 : isManagerPortal ? Users : UserPlus;

  return (
    <>
      {iconOnlyTrigger ? (
        <button
          type="button"
          onClick={open}
          className={cn(managersToolbarIconButtonClass, triggerClassName)}
          aria-label={triggerAriaLabel}
          title={triggerAriaLabel}
        >
          <TriggerIcon className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
        </button>
      ) : triggerLabel ? (
        <button
          type="button"
          onClick={open}
          className={cn(managersToolbarPrimaryButtonClass, triggerClassName)}
          aria-label={triggerAriaLabel}
          title={triggerLabel}
        >
          <TriggerIcon className="h-3.5 w-3.5 shrink-0 text-current" strokeWidth={1.75} aria-hidden />
          <span>{triggerLabel}</span>
        </button>
      ) : (
        <Button
          type="button"
          onClick={open}
          className={cn(
            "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:w-auto",
            triggerClassName,
          )}
          title="Add staff"
        >
          <TriggerIcon className="h-4 w-4" aria-hidden />
          Add staff
        </Button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={cn(
          "fixed left-1/2 top-1/2 z-[120] max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-visible p-0",
          managersToolbarModalShellClass,
          "[&::backdrop]:bg-black/45 [&::backdrop]:backdrop-blur-[2px] dark:[&::backdrop]:bg-black/40",
        )}
        onMouseDown={onBackdropMouseDown}
      >
        {dialogOpen ? <DialogLayerToaster /> : null}
        <HudCornerOverlay />
        <div className="relative z-[1] flex max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-[inherit] bg-inherit">
          <div className="flex shrink-0 flex-col gap-1 border-b border-cyan-600/15 px-5 py-3 dark:border-b-cyan-400/10">
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
                {isResellerPortal ? "Add dealer" : "Add staff"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="text-sm leading-snug text-muted-foreground">
              {isResellerPortal
                ? "New dealers are created under your reseller login. They manage end-user subscriber accounts for your branch."
                : "Choose the account type, then fill in the details."}
            </p>
          </div>

          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {!singleKind ? (
            <div className={addStaffFieldRowClass}>
              <div className="flex min-h-8 items-center gap-1.5 sm:min-h-0">
                <Users className={cn("h-3.5 w-3.5 shrink-0", OPERATOR_ROLE_ICON_CLASS[kind])} strokeWidth={2} aria-hidden />
                <Label htmlFor="staff-add-kind" className="text-sm font-medium text-foreground">
                  Staff type
                </Label>
              </div>
              <div
                id="staff-add-kind"
                role="radiogroup"
                aria-label="Staff type"
                className={cn(segmentedShellClass, kinds.length === 2 ? "grid-cols-2" : "grid-cols-3")}
              >
                {(
                  [
                    { value: "manager" as const, label: "Manager" },
                    { value: "reseller" as const, label: "Reseller" },
                    { value: "dealer" as const, label: "Dealer" },
                  ] as const
                )
                  .filter((opt) => kinds.includes(opt.value))
                  .map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={kind === opt.value}
                    onClick={() => setKind(opt.value)}
                    className={cn(
                      "inline-flex h-8 items-center justify-center rounded-none border text-xs font-semibold transition-colors sm:text-sm",
                      kind === opt.value ? segmentActiveClass(opt.value) : segmentIdleClass(opt.value),
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            ) : null}

            {!singleKind ? (
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              {kind === "manager" ? (
                <p>Managers sign in to the billing portal and oversee resellers, dealers, and users in their branch.</p>
              ) : kind === "reseller" ? (
                <p>Resellers sit under a manager, add dealers, and can own user accounts.</p>
              ) : (
                <p>Dealers belong to a reseller and manage day-to-day user accounts.</p>
              )}
            </div>
            ) : null}

            <div className={cn("mt-2 pt-2", addStaffDividerClass)}>
              {kind === "manager" ? (
                <form key="mgr" action={saveManagerAction} onSubmit={validateCreateStaffPasswords} className="space-y-4">
                  <input type="hidden" name="_intent" value="new" />
                  <input type="hidden" name="return_to_staff" value="1" />

                  <StaffAddCredentialBlock
                    idPrefix="staff-modal-mgr"
                    accentRole="manager"
                    inputClassName={addStaffInputClass}
                    passwordInputClassName={addStaffPasswordInputClass}
                    StaffField={StaffField}
                    onUsernameChange={setMgrDraftUsername}
                  />
                  <StaffField htmlFor="staff-modal-mgr-pass-confirm" label="Confirm password" icon={KeyRound} accentRole="manager">
                    <PasswordFieldWithToggle
                      id="staff-modal-mgr-pass-confirm"
                      name="password_confirm"
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                      required
                    />
                  </StaffField>

                  <StaffCreateInitialCreditsBlock
                    portal={createPortal}
                    kind="manager"
                    idPrefix="staff-modal-mgr"
                    draftUsername={mgrDraftUsername}
                    active={dialogOpen}
                    onValidityChange={setCreditsValid}
                    portalContainerRef={dialogRef}
                  />

                  <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", addStaffDividerClass)}>
                    <StaffHudDashedSubmitButton disabled={!creditsValid}>
                      <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Create manager
                    </StaffHudDashedSubmitButton>
                  </div>
                </form>
              ) : kind === "reseller" ? (
                <form
                  key={isManagerPortal ? "mgr-res" : "res"}
                  action={isManagerPortal ? createManagerResellerAction : saveResellerAction}
                  onSubmit={validateCreateStaffPasswords}
                  className="space-y-3"
                >
                  {!isManagerPortal ? <input type="hidden" name="_intent" value="new" /> : null}
                  <input type="hidden" name="return_to_staff" value="1" />

                  <StaffAddCredentialBlock
                    idPrefix="staff-modal-res"
                    accentRole="reseller"
                    inputClassName={addStaffInputClass}
                    passwordInputClassName={addStaffPasswordInputClass}
                    StaffField={StaffField}
                    onUsernameChange={setResDraftUsername}
                  />
                  <StaffField htmlFor="staff-modal-res-pass-confirm" label="Confirm password" icon={KeyRound} accentRole="reseller">
                    <PasswordFieldWithToggle
                      id="staff-modal-res-pass-confirm"
                      name="password_confirm"
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                      required
                    />
                  </StaffField>
                  {!isManagerPortal ? (
                  <StaffField
                    htmlFor="staff-modal-res-mgr"
                    label="Manager"
                    icon={Building2}
                    accentRole="manager"
                    hint={
                      <>
                        <p className="text-xs text-muted-foreground">
                          {managerSelectedUsername ? `Selected: ${managerSelectedUsername}` : "Pick a manager from the suggestions."}
                        </p>
                        {managerOptions.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Create a manager first before adding resellers.</p>
                        ) : null}
                      </>
                    }
                  >
                    <div ref={managerAnchorRef} className={addStaffComboShellClass}>
                      <div className="relative">
                        <Input
                          id="staff-modal-res-mgr"
                          type="text"
                          value={managerSearch}
                          onChange={(e) => handleManagerSearchChange(e.target.value)}
                          onFocus={() => setManagerPickerOpen(true)}
                          onBlur={() => window.setTimeout(() => setManagerPickerOpen(false), 150)}
                          placeholder="Search and select manager..."
                          autoComplete="off"
                          className={addStaffComboSearchInputClass}
                        />
                        <Search className={addStaffComboSearchIconClass} aria-hidden />
                      </div>
                    </div>
                    <StaffPickerPortal open={managerPickerOpen} anchorRef={managerAnchorRef} containerRef={dialogRef}>
                      {filteredManagerOptions.length ? (
                        <div className={managersToolbarSearchableDropdownListClass}>
                          {filteredManagerOptions.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => selectManagerOption(o.value, o.label)}
                              className={cn(
                                pickerRowBtnClass,
                                managerSelectedUsername === o.value ? segmentActiveClass("manager") : pickerOptionIdleClass,
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">No matching managers</p>
                      )}
                    </StaffPickerPortal>
                    <input type="hidden" name="manager" value={managerSelectedUsername} />
                  </StaffField>
                  ) : null}

                  <StaffCreateInitialCreditsBlock
                    portal={createPortal}
                    kind="reseller"
                    idPrefix="staff-modal-res"
                    payerUsername={creditsPayerUsername}
                    draftUsername={resDraftUsername}
                    active={dialogOpen}
                    onValidityChange={setCreditsValid}
                    portalContainerRef={dialogRef}
                  />

                  <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", addStaffDividerClass)}>
                    <StaffHudDashedSubmitButton
                      disabled={(!isManagerPortal && managerOptions.length === 0) || !creditsValid}
                    >
                      <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Create reseller
                    </StaffHudDashedSubmitButton>
                  </div>
                </form>
              ) : (
                <form
                  key={isManagerPortal ? "mgr-dlr" : isResellerPortal ? "srl-dlr" : "dlr"}
                  action={
                    isManagerPortal
                      ? createManagerDealerAction
                      : isResellerPortal
                        ? createResellerDealerAction
                        : saveDealerAction
                  }
                  onSubmit={validateCreateStaffPasswords}
                  className="space-y-3"
                >
                  {!isManagerPortal && !isResellerPortal ? <input type="hidden" name="_intent" value="new" /> : null}
                  {isManagerPortal || isResellerPortal ? <input type="hidden" name="return_to_staff" value="1" /> : null}

                  <StaffAddCredentialBlock
                    idPrefix="staff-modal-dlr"
                    accentRole="dealer"
                    inputClassName={addStaffInputClass}
                    passwordInputClassName={addStaffPasswordInputClass}
                    StaffField={StaffField}
                    usernameHint={
                      isResellerPortal ? (
                        <p className="text-xs text-muted-foreground">Unique billing login; stored lowercase.</p>
                      ) : undefined
                    }
                    onUsernameChange={setDlrDraftUsername}
                  />
                  <StaffField htmlFor="staff-modal-dlr-pass-confirm" label="Confirm password" icon={KeyRound} accentRole="dealer">
                    <PasswordFieldWithToggle
                      id="staff-modal-dlr-pass-confirm"
                      name="password_confirm"
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                      required
                    />
                  </StaffField>
                  {!isResellerPortal ? (
                  <StaffField
                    htmlFor="staff-modal-dlr-res"
                    label="Parent reseller"
                    icon={Users}
                    accentRole="reseller"
                    hint={
                      <>
                        <p className="text-xs text-muted-foreground">
                          {resellerSelectedUsername ? `Selected: ${resellerSelectedUsername}` : "Pick a reseller from the suggestions."}
                        </p>
                        {resellerOptions.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Create a reseller first before adding dealers.</p>
                        ) : null}
                      </>
                    }
                  >
                    <div ref={resellerAnchorRef} className={addStaffComboShellClass}>
                      <div className="relative">
                        <Input
                          id="staff-modal-dlr-res"
                          type="text"
                          value={resellerSearch}
                          onChange={(e) => handleResellerSearchChange(e.target.value)}
                          onFocus={() => setResellerPickerOpen(true)}
                          onBlur={() => window.setTimeout(() => setResellerPickerOpen(false), 150)}
                          placeholder="Search and select reseller..."
                          autoComplete="off"
                          className={addStaffComboSearchInputClass}
                        />
                        <Search className={addStaffComboSearchIconClass} aria-hidden />
                      </div>
                    </div>
                    <StaffPickerPortal open={resellerPickerOpen} anchorRef={resellerAnchorRef} containerRef={dialogRef}>
                      {filteredResellerOptions.length ? (
                        <div className={managersToolbarSearchableDropdownListClass}>
                          {filteredResellerOptions.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => selectResellerOption(o.value, o.label)}
                              className={cn(
                                pickerRowBtnClass,
                                resellerSelectedUsername === o.value ? segmentActiveClass("reseller") : pickerOptionIdleClass,
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">No matching resellers</p>
                      )}
                    </StaffPickerPortal>
                    <input
                      type="hidden"
                      name={isManagerPortal ? "reseller" : "username_owner"}
                      value={resellerSelectedUsername}
                    />
                  </StaffField>
                  ) : null}

                  <StaffCreateInitialCreditsBlock
                    portal={createPortal}
                    kind="dealer"
                    idPrefix="staff-modal-dlr"
                    payerUsername={creditsPayerUsername}
                    draftUsername={dlrDraftUsername}
                    active={dialogOpen}
                    onValidityChange={setCreditsValid}
                    portalContainerRef={dialogRef}
                  />

                  {!isManagerPortal && !isResellerPortal ? (
                    <StaffField
                      htmlFor="staff-modal-dlr-tickets"
                      label="Tickets in portal"
                      icon={Ticket}
                      accentRole="dealer"
                      hint={<p className="text-xs text-muted-foreground">Allow this dealer to work the ticket queue.</p>}
                    >
                      <input type="hidden" name="tickets_manager" value={dealerTicketsManager} />
                      <div
                        id="staff-modal-dlr-tickets"
                        role="radiogroup"
                        aria-label="Tickets in portal"
                        className={cn(segmentedShellClass, "grid w-full max-w-[220px] grid-cols-2")}
                      >
                        {(["No", "Yes"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={dealerTicketsManager === value}
                            onClick={() => setDealerTicketsManager(value)}
                            className={cn(
                              "inline-flex h-8 items-center justify-center rounded-none border px-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                              dealerTicketsManager === value
                                ? segmentActiveClass("dealer")
                                : segmentIdleClass("dealer"),
                            )}
                          >
                            {value === "Yes" ? "On" : "Off"}
                          </button>
                        ))}
                      </div>
                    </StaffField>
                  ) : null}

                  <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", addStaffDividerClass)}>
                    <StaffHudDashedSubmitButton
                      disabled={(!isResellerPortal && resellerOptions.length === 0) || !creditsValid}
                    >
                      <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Create dealer
                    </StaffHudDashedSubmitButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
