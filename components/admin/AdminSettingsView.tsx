"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Check,
  Copy,
  DollarSign,
  Gauge,
  Globe,
  Hash,
  Lock,
  Mail,
  Megaphone,
  Monitor,
  Palette,
  Shield,
  Sparkles,
  Ticket,
  Type,
  KeyRound,
  Repeat2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { changePasswordAction, saveSettingsAction } from "@/actions/forms";
import { invalidateAfterSettingsMutation } from "@/lib/client/invalidateAfterBillingMutation";
import type { SettingsBundle } from "@/lib/repos/billing";
import type { TicketsDbHealth } from "@/lib/repos/tickets";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AnnouncementComposerEditor } from "@/components/admin/AnnouncementComposerEditor";
import { AnnouncementSlidesManager } from "@/components/admin/AnnouncementSlidesManager";
import {
  SettingsInsetPanel,
  SettingsInput,
  SettingsPanelIcon,
  settingsPanelBodyClass,
  settingsPanelHeaderClass,
  settingsPrimaryButtonClass,
  settingsSectionKickerClass,
  settingsShellClass,
  settingsStickyFooterClass,
  settingsTabButtonClass,
  settingsTabListClass,
  settingsTwoColumnFieldGridClass,
} from "@/components/admin/settings-ui";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import {
  HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
  validateBillingCreditLimitsForm,
} from "@/lib/billing/hierarchyCreditSettingsValidation";
import type { SettingsTabId } from "@/lib/settings-tabs";
import type { LucideIcon } from "lucide-react";

const TABS = [
  { id: "general", label: "General", mobileLabel: "General", icon: Globe },
  { id: "announcement", label: "Announcement", mobileLabel: "Ann.", icon: Megaphone },
  { id: "billing", label: "Billing", mobileLabel: "Billing", icon: DollarSign },
  { id: "notifications", label: "Notifications", mobileLabel: "Notify", icon: Bell },
  { id: "security", label: "Security", mobileLabel: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", mobileLabel: "Theme", icon: Palette },
] as const;

type TabId = SettingsTabId;

// function SettingsPanelHeader({
//   icon,
//   title,
//   description,
// }: {
//   icon: ReactNode;
//   title: string;
//   description: string;
// }) {
//   return (
//     <header className={settingsPanelHeaderClass}>
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
//         <SettingsPanelIcon>{icon}</SettingsPanelIcon>
//         <div className="min-w-0 flex-1 space-y-1">
//           <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
//           <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
//         </div>
//       </div>
//     </header>
//   );
// }

function trialRetryDisplayValue(raw: string): string {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? String(n) : "0";
}

type NotificationConfigKey =
  | "notify_expiring_subscriptions"
  | "notify_low_credit"
  | "notify_new_tickets"
  | "notify_device_offline";

const NOTIFICATION_ROW_META: Record<
  NotificationConfigKey,
  { icon: LucideIcon; title: string; description: string }
> = {
  notify_expiring_subscriptions: {
    icon: Sparkles,
    title: "Expiring subscriptions alert",
    description: "Email or digest before renewal (when wired to your notifier).",
  },
  notify_low_credit: {
    icon: Wallet,
    title: "Low credit balance alert",
    description: "Warn when hierarchy credits fall below your thresholds.",
  },
  notify_new_tickets: {
    icon: Ticket,
    title: "New ticket notifications",
    description: "Aligns with ticket activity in the admin header when integrated.",
  },
  notify_device_offline: {
    icon: Monitor,
    title: "Device offline alerts",
    description: "Requires device telemetry integration.",
  },
};

function NotificationSwitchRow({
  name,
  defaultChecked,
}: {
  name: NotificationConfigKey;
  defaultChecked: boolean;
}) {
  const meta = NOTIFICATION_ROW_META[name];
  const Icon = meta.icon;
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg px-2 py-3.5 transition-[background-color,border-color] duration-300 hover:bg-cyan-500/[0.06] sm:items-center sm:py-4">
      <span className="flex min-w-0 items-start gap-3 pr-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-400 sm:mt-0">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 space-y-1">
          <span className="block text-sm font-medium text-foreground">{meta.title}</span>
          <span className="block text-xs leading-snug text-muted-foreground">{meta.description}</span>
        </span>
      </span>
      <span className="relative inline-flex h-6 w-10 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          value="1"
          defaultChecked={defaultChecked}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className={cn(
            "pointer-events-none h-6 w-10 rounded-full border border-cyan-500/15 bg-black/30 shadow-inner transition-all duration-300 ease-out",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400/40",
            "peer-checked:border-cyan-400/40 peer-checked:bg-cyan-500/80",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out",
            "peer-checked:translate-x-4",
          )}
          aria-hidden
        />
      </span>
    </label>
  );
}

export function AdminSettingsView({
  settings,
  ticketsHealth,
  initialTab = "general",
}: {
  settings: SettingsBundle;
  ticketsHealth?: TicketsDbHealth;
  initialTab?: TabId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(initialTab);
  const formRef = useRef<HTMLFormElement>(null);
  const postSaveInvalidateSigRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTabState(initialTab), 0);
    return () => window.clearTimeout(timer);
  }, [initialTab]);

  useEffect(() => {
    const ok = searchParams.get("ok");
    const tabParam = searchParams.get("tab");
    if (ok !== "1" || tabParam !== "billing") return;
    const sig = `${ok}:${tabParam}`;
    if (postSaveInvalidateSigRef.current === sig) return;
    postSaveInvalidateSigRef.current = sig;
    invalidateAfterSettingsMutation();
  }, [searchParams]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ticketsHealthOpen, setTicketsHealthOpen] = useState(false);
  const [checksCopied, setChecksCopied] = useState(false);
  /** True only for the one programmatic submit after confirm — avoids sticky state if the form does not remount. */
  const allowRealSubmitRef = useRef(false);
  const pendingInvalidFocusRef = useRef<HTMLElement | null>(null);

  const setTab = (id: TabId) => {
    setTabState(id);
    const next = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const activeTabLabel = TABS.find((t) => t.id === tab)?.label ?? "General";
  const showStickySave = tab !== "security" && tab !== "appearance";

  const reportBillingLimitsInvalid = () => {
    const form = formRef.current;
    if (!form) return false;
    const result = validateBillingCreditLimitsForm(form);
    if (result.ok) {
      for (const id of ["hierarchy_add_credit_max", "limit_manager_credit", "limit_reseller_credit", "limit_dealer_credit"]) {
        const el = form.querySelector<HTMLInputElement>(`#${id}`);
        if (el) el.setCustomValidity("");
      }
      return true;
    }
    for (const id of ["hierarchy_add_credit_max", "limit_manager_credit", "limit_reseller_credit", "limit_dealer_credit"]) {
      const el = form.querySelector<HTMLInputElement>(`#${id}`);
      if (el) el.setCustomValidity("");
    }
    const el = form.querySelector<HTMLInputElement>(`#${result.fieldId}`);
    if (el) {
      el.setCustomValidity(result.message);
      el.focus({ preventScroll: false });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.reportValidity();
    }
    return false;
  };

  const onBillingLimitBlur = () => {
    if (tab === "billing") reportBillingLimitsInvalid();
  };

  const validateBeforeSave = () => {
    const form = formRef.current;
    if (!form) return false;
    if (tab === "billing" && !reportBillingLimitsInvalid()) return false;
    if (!form.checkValidity()) {
      jumpToInvalidField();
      return false;
    }
    return true;
  };

  const jumpToInvalidField = () => {
    const form = formRef.current;
    if (!form) return false;
    const firstInvalid = form.querySelector<HTMLElement>(":invalid");
    if (!firstInvalid) return false;

    const panel = firstInvalid.closest<HTMLElement>("section[id^='settings-panel-']");
    const panelTab = panel?.id.replace("settings-panel-", "") as TabId | undefined;
    if (panelTab && panelTab !== tab) {
      pendingInvalidFocusRef.current = firstInvalid;
      setTab(panelTab);
    } else {
      window.requestAnimationFrame(() => {
        firstInvalid.focus({ preventScroll: false });
        firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
        if (firstInvalid instanceof HTMLInputElement || firstInvalid instanceof HTMLTextAreaElement) {
          firstInvalid.reportValidity();
        }
      });
    }

    return true;
  };

  useEffect(() => {
    const el = pendingInvalidFocusRef.current;
    if (!el) return;
    const panel = el.closest<HTMLElement>("section[id^='settings-panel-']");
    const panelTab = (panel?.id.replace("settings-panel-", "") ?? "") as TabId;
    if (!panelTab || panelTab !== tab) return;

    pendingInvalidFocusRef.current = null;
    const id = window.requestAnimationFrame(() => {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.reportValidity();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [tab]);

  const ticketHealthChecksSummary = [
    "Ticket rows with invalid status values (not in progress, fixed, or reopened).",
    "Ticket rows with invalid priority values (not high, normal, or low).",
    "Comment rows that no longer belong to an existing ticket.",
    "Ticket and comment data integrity checks.",
  ].join("\n");

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
      <form
        ref={formRef}
        action={saveSettingsAction}
        className="flex min-h-0 w-full flex-1 flex-col"
        onSubmit={(event) => {
          if (allowRealSubmitRef.current) {
            allowRealSubmitRef.current = false;
            if (tab === "billing" && !reportBillingLimitsInvalid()) {
              event.preventDefault();
              return;
            }
            return;
          }
          event.preventDefault();
          if (!validateBeforeSave()) return;
          setConfirmOpen(true);
        }}
      >
        <input type="hidden" name="active_tab" value={tab} />

        <div className={cn(settingsShellClass, "flex min-h-0 flex-1 flex-col")}>
          <div role="tablist" aria-label="Settings sections" className={cn(settingsTabListClass, "shrink-0")}>
            {TABS.map((t) => {
              const TabIcon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`settings-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`settings-panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={settingsTabButtonClass(tab === t.id)}
                >
                  <TabIcon className={cn("h-3.5 w-3.5 shrink-0", tab === t.id ? "text-cyan-400" : "opacity-70")} aria-hidden />
                  <span className="truncate" title={t.label}>
                    <span className="lg:hidden">{t.mobileLabel}</span>
                    <span className="hidden lg:inline">{t.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="thin-scrollbar relative z-[1] min-h-0 w-full flex-1 overflow-y-auto">
        <section
          id="settings-panel-general"
          role="tabpanel"
          aria-labelledby="settings-tab-general"
          hidden={tab !== "general"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="System configuration"
            description="Set how your billing panel is titled, where system notices go, and what users see by default."
          /> */}

          <div className={cn(settingsPanelBodyClass, "space-y-6")}>
            <div className="space-y-3">
              <div className={settingsSectionKickerClass}>
                <Type className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Branding &amp; contact
              </div>
              <div className={settingsTwoColumnFieldGridClass}>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[13px]">
                    Panel title
                  </Label>
                  <p className="text-xs leading-snug text-muted-foreground">Shown in the browser and billing header.</p>
                  <SettingsInput
                    icon={Type}
                    id="title"
                    name="title"
                    required
                    minLength={3}
                    maxLength={50}
                    defaultValue={settings.title}
                    placeholder="e.g. ZAAPTV4K"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="inline-flex items-center gap-1.5 text-[13px]">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Admin email
                  </Label>
                  <p className="text-xs leading-snug text-muted-foreground">Primary contact for system and billing notices.</p>
                  <SettingsInput
                    icon={Mail}
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={settings.adminEmail}
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
            </div>

            <SettingsInsetPanel
              icon={KeyRound}
              title="PIN & trial access"
              description="Default PIN applies to new users. Trial retries control how many times a user may restart a trial when allowed."
            >
              <div className={settingsTwoColumnFieldGridClass}>
                <div className="space-y-2">
                  <Label htmlFor="pin_default" className="text-[13px]">
                    Default user PIN
                  </Label>
                  <p className="text-xs text-muted-foreground">Exactly four digits.</p>
                  <SettingsInput
                    icon={Hash}
                    id="pin_default"
                    name="pin_default"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    required
                    defaultValue={settings.pinDefault}
                    shellClassName="max-w-full sm:max-w-[11rem]"
                    className="font-mono text-base tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_retry_trial" className="inline-flex items-center gap-1.5 text-[13px]">
                    <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Trial retry count
                  </Label>
                  <p className="text-xs text-muted-foreground">Used only when retry trial is enabled.</p>
                  <SettingsInput
                    icon={Repeat2}
                    id="number_retry_trial"
                    name="number_retry_trial"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    defaultValue={trialRetryDisplayValue(settings.numberRetryTrial)}
                    shellClassName="max-w-full sm:max-w-[11rem]"
                    className="font-mono text-base tabular-nums"
                  />
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-cyan-500/20 bg-background/25 p-3 backdrop-blur-sm transition-[border-color,background-color] duration-300 hover:border-cyan-400/35 hover:bg-cyan-500/[0.06] sm:items-center sm:p-3.5">
                <input
                  type="checkbox"
                  name="portal_tickets_create_enabled"
                  value="1"
                  defaultChecked={settings.portalTicketsCreateEnabled}
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded border-input bg-background text-primary shadow-sm",
                    "transition-[box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:mt-0",
                    "accent-primary enabled:cursor-pointer",
                  )}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">Allow staff to create tickets</span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    When off, managers, resellers, and dealers cannot open new tickets (they can still view their own).
                  </span>
                </span>
              </label>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-cyan-500/20 bg-background/25 p-3 backdrop-blur-sm transition-[border-color,background-color] duration-300 hover:border-cyan-400/35 hover:bg-cyan-500/[0.06] sm:items-center sm:p-3.5">
                <input
                  type="checkbox"
                  name="is_retry_trial"
                  value="1"
                  defaultChecked={settings.isRetryTrial}
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded border-input bg-background text-primary shadow-sm",
                    "transition-[box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:mt-0",
                    "accent-primary enabled:cursor-pointer",
                  )}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">Allow trial retries</span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    Let eligible users start a trial again up to the count above.
                  </span>
                </span>
              </label>
            </SettingsInsetPanel>
          </div>
        </section>

        <section
          id="settings-panel-announcement"
          role="tabpanel"
          aria-labelledby="settings-tab-announcement"
          hidden={tab !== "announcement"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<Megaphone className="h-5 w-5 text-primary" />}
            title="User announcement"
            description="Broadcast news to every billing user. They see a modal after login"
          /> */}
          <div className={cn(settingsPanelBodyClass, "space-y-6")}>
            <div className="space-y-2">
              <Label htmlFor="global_msg" className="text-[13px]">
                Announcement
              </Label>
              <p className="text-xs leading-snug text-muted-foreground">
                Edit the flash title and message in one panel — same layout as the login modal. Click title or body, then use the toolbar for font, color, lists, links, and images. Toggle flash animation for the title with the sparkle button.
              </p>
              <AnnouncementComposerEditor
                bodyId="global_msg"
                bodyName="global_msg"
                flashName="global_announcement_flash"
                defaultBody={settings.announcement}
                defaultFlash={settings.announcementFlash ?? null}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Slide images</Label>
              <p className="text-xs leading-snug text-muted-foreground">
                Optional promo banners in the login modal carousel. Drag thumbnails to set order.
              </p>
              <AnnouncementSlidesManager
                name="global_announcement_slides"
                defaultSlides={settings.announcementSlides ?? []}
              />
            </div>
          </div>
        </section>

        <section
          id="settings-panel-billing"
          role="tabpanel"
          aria-labelledby="settings-tab-billing"
          hidden={tab !== "billing"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            title="Billing configuration"
            description="Set add-credit limits for manager, reseller, and dealer."
          /> */}
          <div className={cn(settingsPanelBodyClass, "space-y-6")}>
            <div className={settingsSectionKickerClass}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
              Hierarchy credit minimums
            </div>
            <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
              Whole numbers from <span className="font-medium text-foreground/90">1</span> to{" "}
              <span className="font-medium text-foreground/90">{HIERARCHY_GLOBAL_ADD_CREDIT_MAX.toLocaleString("en-US")}</span>.
              Global max applies to all
              add actions. Minimums must be less than or equal to the max.
            </p>
            <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2.5">
                <Label htmlFor="hierarchy_add_credit_max" className="text-[13px]">
                  Global max add credit
                </Label>
                <p className="text-xs text-muted-foreground">Maximum base amount per add action.</p>
                <SettingsInput
                  icon={Gauge}
                  id="hierarchy_add_credit_max"
                  name="hierarchy_add_credit_max"
                  type="number"
                  min={1}
                  max={HIERARCHY_GLOBAL_ADD_CREDIT_MAX}
                  step={1}
                  inputMode="numeric"
                  required
                  defaultValue={Math.min(
                    HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                    Math.max(1, Number.parseInt(settings.hierarchyAddCreditMax, 10) || 1),
                  )}
                  onBlur={onBillingLimitBlur}
                  shellClassName="max-w-full sm:max-w-[11rem]"
                  className="font-mono text-base tabular-nums"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="limit_manager_credit" className="text-[13px]">
                  Manager min add credit
                </Label>
                <p className="text-xs text-muted-foreground">Minimum base amount for manager adds.</p>
                <SettingsInput
                  icon={Users}
                  id="limit_manager_credit"
                  name="limit_manager_credit"
                  type="number"
                  min={1}
                  max={Math.min(
                    HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                    Number.parseInt(settings.hierarchyAddCreditMax, 10) || HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                  )}
                  step={1}
                  inputMode="numeric"
                  required
                  defaultValue={settings.limitManagerCredit}
                  onBlur={onBillingLimitBlur}
                  shellClassName="max-w-full sm:max-w-[11rem]"
                  className="font-mono text-base tabular-nums"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="limit_reseller_credit" className="text-[13px]">
                  Reseller min add credit
                </Label>
                <p className="text-xs text-muted-foreground">Minimum base amount for reseller adds.</p>
                <SettingsInput
                  icon={Users}
                  id="limit_reseller_credit"
                  name="limit_reseller_credit"
                  type="number"
                  min={1}
                  max={Math.min(
                    HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                    Number.parseInt(settings.hierarchyAddCreditMax, 10) || HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                  )}
                  step={1}
                  inputMode="numeric"
                  required
                  defaultValue={settings.limitResellerCredit}
                  onBlur={onBillingLimitBlur}
                  shellClassName="max-w-full sm:max-w-[11rem]"
                  className="font-mono text-base tabular-nums"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="limit_dealer_credit" className="text-[13px]">
                  Dealer min add credit
                </Label>
                <p className="text-xs text-muted-foreground">Minimum base amount for dealer adds.</p>
                <SettingsInput
                  icon={Users}
                  id="limit_dealer_credit"
                  name="limit_dealer_credit"
                  type="number"
                  min={1}
                  max={Math.min(
                    HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                    Number.parseInt(settings.hierarchyAddCreditMax, 10) || HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
                  )}
                  step={1}
                  inputMode="numeric"
                  required
                  defaultValue={settings.limitDealerCredit}
                  onBlur={onBillingLimitBlur}
                  shellClassName="max-w-full sm:max-w-[11rem]"
                  className="font-mono text-base tabular-nums"
                />
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-foreground">Promo bonus tiers</h4>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Configure Promo 1 (by requested credit amount) and Promo 2 (by active client count). Both combine when adding credits to managers, resellers, or dealers.
              </p>
              <Link
                href="/admin/bonus-rules"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition hover:decoration-primary"
              >
                Go to bonus rules
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="settings-panel-notifications"
          role="tabpanel"
          aria-labelledby="settings-tab-notifications"
          hidden={tab !== "notifications"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<Bell className="h-5 w-5 text-primary" />}
            title="Notification preferences"
            description="Toggle which alerts run in the admin UI. Stored in the billing configs table."
          /> */}
          <div className={cn(settingsPanelBodyClass, "space-y-4")}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            When off, the admin header ticket badge, dashboard KPIs, and user summary tiles skip the related counts (fewer
            queries). Email or external jobs are not sent from this app yet.
          </p>
          <div className="divide-y divide-border/80 rounded-lg border border-border/60 bg-muted/10 px-2 sm:px-3">
            <NotificationSwitchRow name="notify_expiring_subscriptions" defaultChecked={settings.notifyExpiringSubscriptions} />
            <NotificationSwitchRow name="notify_low_credit" defaultChecked={settings.notifyLowCredit} />
            <NotificationSwitchRow name="notify_new_tickets" defaultChecked={settings.notifyNewTickets} />
            <NotificationSwitchRow name="notify_device_offline" defaultChecked={settings.notifyDeviceOffline} />
          </div>
          </div>
        </section>

        <section
          id="settings-panel-security"
          role="tabpanel"
          aria-labelledby="settings-tab-security"
          hidden={tab !== "security"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<Lock className="h-5 w-5 text-primary" />}
            title="Security"
            description="Change your admin password. After a successful update, you will be signed out and asked to log in again."
          /> */}

          <div className={cn(settingsPanelBodyClass, "space-y-4")}>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Change password</p>
              <input type="hidden" name="return_to" value="settings" />
              <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                <Label htmlFor="settings-old-password">Current password</Label>
                <SettingsInput
                  icon={KeyRound}
                  id="settings-old-password"
                  name="old_password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Type your current password"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                <Label htmlFor="settings-new-password">New password</Label>
                <SettingsInput
                  icon={Lock}
                  id="settings-new-password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="4–12 characters"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                <Label htmlFor="settings-new-password-confirm">Confirm new password</Label>
                <SettingsInput
                  icon={Lock}
                  id="settings-new-password-confirm"
                  name="new_confirm_passsword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Retype your new password"
                />
              </div>
              <div className="grid gap-2 pt-1 sm:grid-cols-[180px_1fr]">
                <span className="hidden sm:block" aria-hidden />
                <div className="flex justify-end">
                  <Button
                  type="submit"
                  formAction={changePasswordAction}
                  formNoValidate
                  className="min-h-10 gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={() => {
                    allowRealSubmitRef.current = true;
                  }}
                >
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Change password
                  <ArrowUpRight className="h-4 w-4 opacity-90" aria-hidden />
                </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="settings-panel-appearance"
          role="tabpanel"
          aria-labelledby="settings-tab-appearance"
          hidden={tab !== "appearance"}
          className="w-full outline-none"
        >
          {/* <SettingsPanelHeader
            icon={<Palette className="h-5 w-5 text-primary" />}
            title="Appearance"
            description="Customize the look and feel. Theme preference is saved in your browser."
          /> */}
          <div className={cn(settingsPanelBodyClass, "flex flex-col gap-4 sm:flex-row sm:items-center")}>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Theme</p>
              <p className="mt-1 text-sm text-foreground">Light / dark</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

          </div>

          {showStickySave ? (
            <footer className={cn(settingsStickyFooterClass, "shrink-0")}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Saves the <span className="font-medium text-foreground">{activeTabLabel}</span> tab only. Switch tabs to
                edit other sections, then save each when ready.
              </p>
              <Button
                type="submit"
                size="sm"
                className={settingsPrimaryButtonClass}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Save {activeTabLabel}
              </Button>
            </footer>
          ) : null}
        </div>
      </form>
      {confirmOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className={cn("absolute inset-0", managersToolbarModalBackdropClass)}
            aria-label="Close"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-save-confirm-title"
            className={cn(
              "relative z-10 w-full max-w-md overflow-hidden shadow-xl",
              managersToolbarModalShellClass,
            )}
          >
            <HudCornerOverlay tone="bright" />
            <div className="relative z-[1] p-5 sm:p-6">
              <h3 id="settings-save-confirm-title" className="text-base font-semibold tracking-tight text-foreground">
                Confirm settings save
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                You are about to save changes on the{" "}
                <span className="font-semibold text-foreground">{activeTabLabel}</span> tab.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Other sections stay unchanged until you edit and save them separately.
              </p>
              <div className="mt-4 rounded-md border border-cyan-600/22 bg-muted/15 px-3 py-2.5 dark:border-cyan-400/14 dark:bg-[hsl(222_47%_9%/0.5)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tab to save</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activeTabLabel}</p>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-cyan-600/15 pt-4 dark:border-t-cyan-400/10">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan-600/22 bg-background/60 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted/40 dark:border-cyan-400/14"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    if (!validateBeforeSave()) return;
                    allowRealSubmitRef.current = true;
                    requestAnimationFrame(() => formRef.current?.requestSubmit());
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Confirm save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {ticketsHealthOpen && ticketsHealth ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" onClick={() => setTicketsHealthOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-border/70 bg-transparent p-5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold tracking-tight text-foreground">Tickets health details</h3>
            <p className="mt-1 text-sm text-muted-foreground">Quick diagnostics for tickets and TV channel categories.</p>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets rows</p>
                <p className="font-semibold text-foreground">{ticketsHealth.billing.ticketRows}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Comments rows</p>
                <p className="font-semibold text-foreground">{ticketsHealth.billing.commentRows}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Orphan comments</p>
                <p className={cn("font-semibold", ticketsHealth.billing.orphanComments > 0 ? "text-amber-300" : "text-foreground")}>{ticketsHealth.billing.orphanComments}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invalid status / priority</p>
                <p className={cn("font-semibold", (ticketsHealth.billing.badStatusRows + ticketsHealth.billing.badPriorityRows) > 0 ? "text-amber-300" : "text-foreground")}>
                  {ticketsHealth.billing.badStatusRows} / {ticketsHealth.billing.badPriorityRows}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks performed</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-foreground">
                {ticketHealthChecksSummary.split("\n").map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(ticketHealthChecksSummary);
                    setChecksCopied(true);
                    window.setTimeout(() => setChecksCopied(false), 1200);
                  } catch {}
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
                {checksCopied ? "Copied" : "Copy summary"}
              </Button>
              <Button type="button" onClick={() => setTicketsHealthOpen(false)} className="h-9 gap-1.5">
                <Check className="h-4 w-4" aria-hidden />
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
