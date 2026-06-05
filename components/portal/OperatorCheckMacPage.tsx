"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Network,
  Radar,
  ScanLine,
  ScanSearch,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { MacAddressInput } from "@/components/forms/MacAddressInput";
import { checkMacDealerAction, checkMacManagerAction, checkMacResellerAction } from "@/actions/forms";
import {
  deductionsHudDividerClass,
  deductionsHudHeaderBarClass,
  managersToolbarModalGlassClass,
  managersToolbarGreyBorder,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import type { PortalBase } from "@/lib/portal-nav";
import { cn } from "@/lib/cn";

type OwnerType = "MNGR" | "SRSLR" | "RSLR";

const checkMacHudPanelClass = cn(
  "relative overflow-hidden rounded-lg text-foreground shadow-none ring-0",
  managersToolbarGreyBorder,
  managersToolbarModalGlassClass,
);

const checkMacHudSubmitClass = cn(
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-500/45 px-5 text-sm font-semibold text-white antialiased",
  "bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-800",
  "shadow-[0_1px_2px_rgba(0,0,0,0.35),0_0_20px_-6px_rgba(34,211,238,0.5)]",
  "transition-all duration-200 ease-out",
  "hover:border-cyan-400/55 hover:brightness-110 hover:shadow-[0_2px_4px_rgba(0,0,0,0.35),0_0_24px_-4px_rgba(34,211,238,0.55)]",
  "active:scale-[0.98] active:brightness-95",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-50",
);

function checkMacActionForRole(ownerType: OwnerType) {
  if (ownerType === "MNGR") return checkMacManagerAction;
  if (ownerType === "SRSLR") return checkMacResellerAction;
  return checkMacDealerAction;
}

type OutcomeTone = "neutral" | "warn" | "error" | "success" | "info";

function outcomeHudClass(tone: OutcomeTone) {
  const map: Record<OutcomeTone, string> = {
    neutral: "border-cyan-600/20 bg-cyan-500/[0.04] dark:border-cyan-400/15",
    warn: "border-amber-500/35 bg-amber-500/[0.07] dark:border-amber-400/30",
    error: "border-rose-500/35 bg-rose-500/[0.07] dark:border-rose-400/28",
    success: "border-emerald-500/35 bg-emerald-500/[0.07] dark:border-emerald-400/28",
    info: "border-sky-500/35 bg-sky-500/[0.07] dark:border-sky-400/28",
  };
  return cn(
    "relative flex gap-3 overflow-hidden rounded-lg border p-4",
    managersToolbarGreyBorder,
    map[tone],
  );
}

function OutcomeIcon({ tone }: { tone: OutcomeTone }) {
  const iconClass = "h-5 w-5 shrink-0";
  if (tone === "warn") return <AlertTriangle className={cn(iconClass, "text-amber-400")} aria-hidden />;
  if (tone === "error") return <XCircle className={cn(iconClass, "text-rose-400")} aria-hidden />;
  if (tone === "success") return <CheckCircle2 className={cn(iconClass, "text-emerald-400")} aria-hidden />;
  if (tone === "info") return <ShieldCheck className={cn(iconClass, "text-sky-400")} aria-hidden />;
  return <HelpCircle className={cn(iconClass, "text-cyan-400/80")} aria-hidden />;
}

function OutcomePanel({
  out,
  expired,
  expiresRaw,
}: {
  out: string | undefined;
  expired: string | undefined;
  expiresRaw: string | undefined;
}) {
  if (!out || out === "") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg border",
            managersToolbarGreyBorder,
            "bg-cyan-500/[0.06] text-cyan-400/70",
          )}
        >
          <ScanSearch className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Enter a MAC above and run a lookup. Status will display in this panel.
        </p>
      </div>
    );
  }

  function ResultBlock({ tone, title, children }: { tone: OutcomeTone; title: string; children: ReactNode }) {
    return (
      <div role="status" className={outcomeHudClass(tone)}>
        <HudCornerOverlay tone="bright" className="opacity-60" />
        <OutcomeIcon tone={tone} />
        <div className="relative z-[1] min-w-0 space-y-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-500/80 dark:text-cyan-300/75">
            {title}
          </p>
          <div className="text-sm leading-relaxed text-foreground/95">{children}</div>
        </div>
      </div>
    );
  }

  if (out === "missing") {
    return (
      <ResultBlock tone="warn" title="Input required">
        Please enter a MAC address before checking.
      </ResultBlock>
    );
  }

  if (out === "invalid") {
    return (
      <ResultBlock tone="error" title="Invalid format">
        Use six hex pairs, for example{" "}
        <span className="font-mono text-foreground">AA:BB:CC:DD:EE:FF</span>.
      </ResultBlock>
    );
  }

  if (out === "available") {
    return (
      <ResultBlock tone="success" title="Available">
        No account uses this MAC. You can assign it to a new or existing user.
      </ResultBlock>
    );
  }

  if (out === "ambiguous") {
    return (
      <ResultBlock tone="error" title="Duplicate records">
        More than one account matched this MAC. Contact support so the duplicate can be resolved.
      </ResultBlock>
    );
  }

  if (out === "exists") {
    const isExpired = expired === "1";
    const expiresLabel =
      expiresRaw && expiresRaw.trim() !== ""
        ? expiresRaw.includes("T")
          ? expiresRaw
          : expiresRaw.replace(" ", "T")
        : null;
    const pretty = expiresLabel
      ? (() => {
          const d = new Date(expiresLabel);
          return Number.isNaN(d.getTime()) ? expiresRaw : d.toLocaleString();
        })()
      : null;
    return (
      <ResultBlock tone={isExpired ? "warn" : "info"} title={isExpired ? "Registered · expired" : "Registered · active"}>
        <p>This MAC is already assigned to an account in billing.</p>
        {pretty ? (
          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-cyan-400/70" aria-hidden />
            <span>
              Expiry: <span className="font-mono text-foreground/90">{pretty}</span>
            </span>
          </p>
        ) : null}
      </ResultBlock>
    );
  }

  return (
    <ResultBlock tone="neutral" title="Unknown">
      Something went wrong. Try again.
    </ResultBlock>
  );
}

export function OperatorCheckMacPage({
  portalBase: _portalBase,
  ownerType,
  searchParams: sp,
}: {
  portalBase: PortalBase;
  ownerType: OwnerType;
  searchParams: { out?: string; expired?: string; e?: string };
}) {
  const action = checkMacActionForRole(ownerType);
  const macInputRef = React.useRef<HTMLInputElement>(null);

  const copyMacFromField = React.useCallback(() => {
    const text = macInputRef.current?.value.trim() ?? "";
    if (!text) return;
    void navigator.clipboard.writeText(text).then(
      () => toast.success("MAC address copied."),
      () => toast.error("Could not copy to clipboard."),
    );
  }, []);

  const out = sp.out?.trim();
  const expired = sp.expired?.trim();
  let expiresRaw: string | undefined;
  try {
    expiresRaw = sp.e ? decodeURIComponent(sp.e) : undefined;
  } catch {
    expiresRaw = sp.e;
  }

  const hasResult = Boolean(out);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-10 pt-1">
      <header className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
            managersToolbarGreyBorder,
            "bg-gradient-to-br from-cyan-600/25 via-cyan-700/15 to-transparent text-cyan-300",
            "shadow-[0_0_20px_-8px_rgba(34,211,238,0.45)]",
          )}
        >
          <ScanLine className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold uppercase tracking-[0.08em] text-foreground drop-shadow-[0_0_14px_rgba(34,211,238,0.18)] sm:text-2xl">
            Check MAC
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Device lookup against billing — registration and subscription status.
          </p>
        </div>
      </header>

      <section aria-label="MAC address lookup" className={checkMacHudPanelClass}>
        <HudCornerOverlay tone="bright" />

        <form action={action} className={cn("relative z-[1] p-5 sm:p-6", deductionsHudHeaderBarClass)}>
          <label
            htmlFor="mac-input"
            className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-500/85 dark:text-cyan-300/80"
          >
            <Network className="h-3.5 w-3.5" aria-hidden />
            MAC address
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <MacAddressInput
              ref={macInputRef}
              variant="hud"
              copyable
              id="mac-input"
              name="mac"
              autoComplete="off"
              spellCheck={false}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="text-sm sm:text-sm"
            />
            <button
              type="submit"
              title="Click to copy MAC, or submit lookup"
              className={cn(checkMacHudSubmitClass, "cursor-copy sm:self-stretch")}
              onClick={copyMacFromField}
            >
              <Radar className="h-4 w-4 shrink-0" aria-hidden />
              Check
            </button>
          </div>
        </form>

        <div
          className={cn(
            "relative z-[1] px-5 py-5 sm:px-6 sm:py-6",
            deductionsHudDividerClass,
            "border-t",
            hasResult && "bg-black/[0.02] dark:bg-white/[0.03]",
          )}
        >
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <ScanSearch className="h-3.5 w-3.5 text-cyan-400/60" aria-hidden />
            Scan result
          </h2>
          <OutcomePanel out={out} expired={expired} expiresRaw={expiresRaw} />
        </div>
      </section>
    </div>
  );
}
