"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { useTheme } from "@/contexts/ThemeContext";
import { MessageKpiHudDetailTable } from "@/components/ui/MessageKpiHudDetailTable";
import {
  messageKpiBeltIconLightClass,
  messageKpiBeltLabelLightClass,
} from "@/lib/messages/messageKpiBeltLightStyles";
import type { MessageKpiBeltRow } from "@/lib/messages/messageKpiBeltTypes";

const LABEL_W = "min-w-[6.75rem] w-[28%] max-w-[7.5rem] sm:min-w-[7rem] sm:max-w-[8.25rem]";

function BeltExpandButton({
  open,
  panelId,
  label,
  onToggle,
  compact,
  isLight,
}: {
  open: boolean;
  panelId: string;
  label: string;
  onToggle: () => void;
  compact: boolean;
  isLight: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center self-stretch rounded-lg border outline-none transition-[filter,border-color,background-color] duration-200 ease-out",
        isLight
          ? "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400/40"
          : "border-cyan-500/35 bg-gradient-to-br from-cyan-800/55 via-slate-900/95 to-slate-950 text-cyan-100/95 shadow-[0_1px_3px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-cyan-400/55 hover:brightness-[1.08] focus-visible:ring-2 focus-visible:ring-cyan-400/55",
        open && !isLight && "border-cyan-400/50 brightness-[1.06]",
        open && isLight && "border-slate-400 bg-slate-200",
        compact ? "h-[30px] w-[30px] min-w-[30px]" : "h-[34px] w-[34px] min-w-[34px] sm:h-[38px] sm:w-[38px] sm:min-w-[38px]",
      )}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? `Collapse ${label} details` : `Expand ${label} details`}
      title={open ? "Collapse" : "Expand details"}
    >
      {!isLight ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-transparent via-white/[0.04] to-white/[0.12]"
          aria-hidden
        />
      ) : null}
      <ChevronDown
        className={cn(
          "relative z-[1] size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
          open && "motion-safe:rotate-180",
          isLight ? "text-slate-700" : "text-cyan-100/95",
          open && !isLight && "text-cyan-50",
        )}
        strokeWidth={2.35}
        aria-hidden
      />
    </button>
  );
}

/**
 * Message KPI accordion rows — label + headline + expand control; details in dropdown only.
 */
export function MessageKpiDropdownBelts({
  rows,
  className,
  density = "default",
}: {
  rows: MessageKpiBeltRow[];
  className?: string;
  density?: "default" | "compact";
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const uid = useId();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const compact = density === "compact";
  const rowMinH = compact ? "min-h-[30px]" : "min-h-[34px] sm:min-h-[38px]";

  const toggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className={cn("relative w-full min-w-0 flex-1 self-stretch", className)}>
      <div className="flex w-full flex-col gap-1 sm:gap-1.5">
        {rows.map((r) => {
          const open = openKey === r.key;
          const panelId = `${uid}-belt-${r.key}`;

          const labelSurface = isLight
            ? cn("border font-bold shadow-none", messageKpiBeltLabelLightClass(r.gradient))
            : cn(
                "bg-gradient-to-r text-white shadow-[0_3px_10px_-4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]",
                r.gradient,
              );

          const iconClass = isLight ? messageKpiBeltIconLightClass(r.gradient) : r.iconClass;

          return (
            <div key={r.key} className="group relative w-full min-w-0">
              <div
                className={cn(
                  "relative flex w-full min-w-0 items-stretch gap-1.5 sm:gap-2",
                  rowMinH,
                  r.muted && "opacity-55",
                )}
              >
                <div
                  className={cn(
                    "relative isolate shrink-0 overflow-hidden rounded-lg",
                    !isLight && "border border-white/[0.12]",
                    labelSurface,
                    rowMinH,
                    LABEL_W,
                  )}
                >
                  {!isLight ? (
                    <div
                      className="pointer-events-none absolute bottom-1 left-0 top-1 z-[1] w-[3px] rounded-full bg-white/40"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-[2] flex h-full items-center justify-center px-2 py-1 text-center">
                    <span
                      className={cn(
                        "line-clamp-2 text-[9px] font-bold leading-[1.15] tracking-wide sm:text-[10px]",
                        isLight ? "opacity-100" : "text-white/75",
                      )}
                    >
                      {r.label}
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1",
                    rowMinH,
                    isLight
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/[0.08] bg-slate-950/45",
                  )}
                >
                  <r.Icon
                    className={cn("size-3.5 shrink-0 opacity-90 sm:size-4", iconClass)}
                    strokeWidth={1.9}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[9px] font-semibold tabular-nums sm:text-[10px]",
                      isLight ? "text-slate-800" : "text-white/70",
                    )}
                  >
                    {r.headline}
                  </span>
                </div>

                <BeltExpandButton
                  open={open}
                  panelId={panelId}
                  label={r.label}
                  onToggle={() => toggle(r.key)}
                  compact={compact}
                  isLight={isLight}
                />
              </div>

              <div
                id={panelId}
                className={cn(
                  "grid w-full motion-safe:transition-[grid-template-rows,opacity,margin] motion-safe:duration-300 motion-safe:ease-out",
                  open ? "mt-1.5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
                )}
                aria-hidden={!open}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={cn(
                      "w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
                      open ? "translate-y-0" : "-translate-y-1",
                    )}
                  >
                    <MessageKpiHudDetailTable rows={r.details} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
