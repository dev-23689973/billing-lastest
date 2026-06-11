"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  adminListPanelShellClass,
  hudFormControlShellClass,
  hudFormInputInnerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";
import {
  rsGapStack,
  rsIconSm,
  rsPadPanelBody,
  rsPadPanelHeader,
  rsTextBodyTight,
  rsTextKicker,
  rsTextLabel,
} from "@/lib/ui/responsiveScale";

/** Outer settings card — same panel shell as resellers / managers list pages. */
export const settingsShellClass = cn("relative w-full min-w-0", adminListPanelShellClass);

export const settingsTabListClass =
  "grid w-full grid-cols-2 gap-1 border-b border-border/60 bg-transparent p-1.5 sm:grid-cols-3 sm:gap-1.5 sm:p-2 lg:grid-cols-6";

export const settingsPanelHeaderClass = cn("border-b border-border/60 bg-transparent", rsPadPanelHeader);

export const settingsPanelBodyClass = cn("w-full bg-transparent", rsPadPanelBody);

export const settingsStickyFooterClass = cn(
  "flex flex-col border-t border-border/60 bg-transparent",
  rsGapStack,
  rsPadPanelHeader,
  "sm:flex-row sm:items-center sm:justify-between",
);

export const settingsSectionKickerClass = cn("flex items-center gap-2 text-cyan-400/80", rsTextKicker);

export const settingsInsetPanelClass =
  "rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5 dark:bg-white/[0.02]";

export const settingsInputIconClass = cn(rsIconSm, "self-center text-cyan-400/75");

/** Side-by-side fields — inputs share one baseline when label/hint heights differ. */
export const settingsTwoColumnFieldGridClass = "grid gap-4 sm:grid-cols-2 sm:items-end";

/** Icon + unified shell — single border, no native number spinners. */
export function SettingsInput({
  icon: Icon,
  shellClassName,
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
  shellClassName?: string;
}) {
  return (
    <div className={cn(hudFormControlShellClass, shellClassName)}>
      {Icon ? <Icon className={settingsInputIconClass} aria-hidden /> : null}
      <input type={type} className={cn(hudFormInputInnerClass, className)} {...props} />
    </div>
  );
}

export const HudFormInput = SettingsInput;

/** Textarea shell — same single-box chrome as `SettingsInput`. */
export const settingsTextareaShellClass = cn(
  hudFormControlShellClass,
  "h-auto min-h-[11rem] flex-col items-stretch gap-0 px-3 py-2",
);

export const settingsTextareaClass = cn(
  "min-h-[10rem] w-full min-w-0 flex-1 resize-y appearance-none",
  "rounded-none border-0 bg-transparent px-0 py-0",
  "font-mono text-xs leading-relaxed shadow-none outline-none ring-0 sm:text-sm",
  "placeholder:text-muted-foreground/90",
  "focus-visible:outline-none focus-visible:ring-0",
);

export const settingsPrimaryButtonClass = cn(
  "min-h-9 shrink-0 gap-2 rounded-lg border-0 px-3 font-semibold sm:min-h-10 sm:px-4",
  rsTextBodyTight,
  "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white",
  "shadow-[0_0_20px_-4px_rgba(34,211,238,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]",
  "transition-[filter,transform,box-shadow] duration-300 ease-out",
  "hover:brightness-110 hover:shadow-[0_0_24px_-2px_rgba(34,211,238,0.5)]",
  "active:scale-[0.98]",
);

export const settingsOutlineButtonClass = cn(
  "min-h-9 gap-1.5 rounded-lg border border-cyan-500/25 bg-background/20 backdrop-blur-sm",
  "text-foreground transition-all duration-300 ease-out",
  "hover:border-cyan-400/40 hover:bg-cyan-500/10",
);

export function settingsTabButtonClass(active: boolean) {
  return cn(
    "flex min-h-9 w-full flex-row items-center justify-center gap-1.5 rounded-lg px-2 py-2",
    "text-[10px] font-medium leading-none transition-all duration-300 ease-out sm:min-h-10 sm:gap-2 sm:px-2.5 sm:text-xs",
    active
      ? "bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-cyan-400/35"
      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
  );
}

export function SettingsPanelIcon({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        "border border-cyan-400/30 bg-cyan-500/10 text-cyan-400",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_16px_-6px_rgba(34,211,238,0.35)]",
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

function LabelBlock({
  icon: Icon,
  label,
  hint,
  htmlFor,
}: {
  icon?: LucideIcon;
  label: string;
  hint?: string;
  htmlFor?: string;
}) {
  const labelEl = (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", rsTextLabel)}>
      {Icon ? <Icon className={cn(rsIconSm, "text-cyan-400/80")} aria-hidden /> : null}
      {label}
    </span>
  );
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block cursor-default">
          {labelEl}
        </label>
      ) : (
        labelEl
      )}
      {hint ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SettingsField({
  icon,
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <LabelBlock icon={icon} label={label} hint={hint} htmlFor={htmlFor} />
      {children}
    </div>
  );
}

export function SettingsInsetPanel({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(settingsInsetPanelClass, "space-y-4", className)}>
      <div className="space-y-1">
        <p className={cn(settingsSectionKickerClass, "normal-case tracking-normal text-sm text-foreground")}>
          {Icon ? <Icon className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden /> : null}
          {title}
        </p>
        {description ? <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
