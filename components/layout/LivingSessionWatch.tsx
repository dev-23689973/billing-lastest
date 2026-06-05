"use client";

import { useId, useSyncExternalStore } from "react";
import { useSessionElapsedSeconds } from "@/lib/useSessionElapsedSeconds";
import { cn } from "@/lib/cn";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { text: `${pad2(h)}:${pad2(m)}:${pad2(s)}` };
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** For LIVE.CORE, we want a dot between the words. */
function splitHudLabel(label: string): { left: string; right: string | null } {
  const t = label.trim();
  const dot = t.indexOf(".");
  if (dot === -1) return { left: t, right: null };
  const a = t.slice(0, dot).trim();
  const b = t.slice(dot + 1).trim();
  if (!a) return { left: b || t, right: null };
  if (!b) return { left: a, right: null };
  return { left: a, right: b };
}

function isoDurationSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total % 60));
  const m = Math.floor((total / 60) % 60);
  const h = Math.floor(total / 3600);
  if (h > 0) return `PT${h}H${m}M${s}S`;
  if (m > 0) return `PT${m}M${s}S`;
  return `PT${s}S`;
}

type Props = {
  className?: string;
  label?: string;
  viewerName?: string;
};

const SIZE = 116;
const CX = SIZE / 2;
const CY = SIZE / 2;

const R_TRACK = 50;
const R_HOUR = 38;
const R_INNER = 30;

const C_TRACK = 2 * Math.PI * R_TRACK;
const C_HOUR = 2 * Math.PI * R_HOUR;

const STROKE_HOUR = 1.65;

function svgN(n: number) {
  return Math.round(n * 10000) / 10000;
}

const OCT_CLIP = "polygon(28% 2%, 72% 2%, 98% 28%, 98% 72%, 72% 98%, 28% 98%, 2% 72%, 2% 28%)";

export function LivingSessionWatch({ className, label = "LIVE.CORE", viewerName }: Props) {
  const uid = useId().replace(/:/g, "");
  const gidViolet = `lsw-violet-${uid}`;

  const elapsed = useSessionElapsedSeconds();
  const { text: timeText } = formatHMS(elapsed);
  const labelParts = splitHudLabel(label);
  const prefersReducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const hourFrac = (elapsed % 3600) / 3600;
  const dashHour = svgN(C_HOUR * (1 - hourFrac));

  const dotY = svgN(CY - R_TRACK + 0.8);

  const chipX = svgN(CX + R_TRACK * Math.cos(-Math.PI / 2 + Math.PI / 5));
  const chipY = svgN(CY + R_TRACK * Math.sin(-Math.PI / 2 + Math.PI / 5));

  return (
    <div
      className={cn(
        "living-session-watch relative mx-auto flex w-full max-w-[116px] flex-col items-center gap-1",
        "[--lsw-track-outer:#cbd5e1] [--lsw-track-seg:#64748b] [--lsw-inner-ring:#e2e8f0]",
        "[--lsw-hour:#7c3aed] [--lsw-chip-bg:#ffffff] [--lsw-chip-stroke:#94a3b8]",
        "[--lsw-dot:#0891b2] [--lsw-fuchsia:#a855f7] [--lsw-stroke-track:2.85] [--lsw-stroke-track-bg:2.65]",
        "dark:[--lsw-stroke-track:3.25] dark:[--lsw-stroke-track-bg:4.6]",
        "dark:[--lsw-track-outer:rgba(15,23,42,0.98)] dark:[--lsw-track-seg:rgba(71,85,105,0.55)]",
        "dark:[--lsw-inner-ring:rgba(34,211,238,0.12)] dark:[--lsw-hour:#a855f7]",
        "dark:[--lsw-chip-bg:rgba(15,23,42,0.92)] dark:[--lsw-chip-stroke:rgba(34,211,238,0.75)]",
        "dark:[--lsw-dot:#22d3ee] dark:[--lsw-fuchsia:#e879f9]",
        className,
      )}
      aria-label={
        viewerName ? `Session uptime ${timeText}, signed in as ${viewerName}` : `Session uptime ${timeText}`
      }
    >
      <div className="relative aspect-square w-full" style={{ maxWidth: SIZE }}>
        <div
          className={cn(
            "absolute inset-0 overflow-hidden bg-white",
            "ring-1 ring-slate-200/90 shadow-sm",
            "dark:bg-transparent dark:ring-1 dark:ring-cyan-400/35 dark:shadow-[0_0_32px_-12px_rgba(34,211,238,0.5)]",
          )}
          style={{ clipPath: OCT_CLIP }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="relative z-[1] block h-full w-full select-none"
            aria-hidden
          >
            <defs>
              <linearGradient id={gidViolet} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            <circle
              cx={CX}
              cy={CY}
              r={R_TRACK}
              fill="none"
              stroke="var(--lsw-track-outer)"
              strokeWidth="var(--lsw-stroke-track-bg)"
            />
            <g>
              {!prefersReducedMotion ? (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`-90 ${CX} ${CY}`}
                  to={`270 ${CX} ${CY}`}
                  dur="42s"
                  repeatCount="indefinite"
                />
              ) : null}
              <circle
                cx={CX}
                cy={CY}
                r={R_TRACK}
                fill="none"
                stroke="var(--lsw-track-seg)"
                strokeWidth="var(--lsw-stroke-track)"
                strokeDasharray={`${svgN(C_TRACK * 0.18)} ${svgN(C_TRACK * 0.82)}`}
                strokeDashoffset={svgN(C_TRACK * 0.48)}
                strokeLinecap="round"
              />
            </g>

            <circle
              cx={CX}
              cy={CY}
              r={R_INNER}
              fill="none"
              stroke="var(--lsw-inner-ring)"
              strokeWidth={0.95}
              className="motion-safe:animate-session-inner-glow"
            />

            <circle
              cx={CX}
              cy={CY}
              r={R_HOUR}
              fill="none"
              stroke={`url(#${gidViolet})`}
              strokeWidth={STROKE_HOUR}
              strokeLinecap="round"
              strokeDasharray={svgN(C_HOUR)}
              strokeDashoffset={dashHour}
              transform={`rotate(-90 ${CX} ${CY})`}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />

            <circle cx={CX} cy={dotY} r={2} fill="var(--lsw-dot)">
              {!prefersReducedMotion ? (
                <>
                  <animate attributeName="opacity" values="1;0.5;1" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="r" values="2;2.4;2" dur="2.6s" repeatCount="indefinite" />
                </>
              ) : null}
            </circle>

            <g transform={`translate(${chipX} ${chipY}) rotate(38)`}>
              <rect
                x={-5.5}
                y={-3.5}
                width={11}
                height={7}
                rx={1.2}
                fill="var(--lsw-chip-bg)"
                stroke="var(--lsw-chip-stroke)"
                strokeWidth={0.85}
              />
              <rect x={-3.2} y={-2.2} width={2.6} height={4.4} fill="var(--lsw-dot)" rx={0.35} />
              <rect x={0.6} y={-2.2} width={2.6} height={4.4} fill="var(--lsw-fuchsia)" rx={0.35} opacity={0.98} />
            </g>

            {prefersReducedMotion ? null : (
              <>
                <g opacity={0.95}>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${CX} ${CY}`}
                    to={`360 ${CX} ${CY}`}
                    dur="20s"
                    repeatCount="indefinite"
                  />
                  <circle cx={CX} cy={CY - R_TRACK} r={2.05} fill="var(--lsw-dot)" />
                </g>
                <g opacity={0.9}>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`360 ${CX} ${CY}`}
                    to={`0 ${CX} ${CY}`}
                    dur="32s"
                    repeatCount="indefinite"
                  />
                  <circle
                    cx={svgN(CX + 0.72 * R_TRACK)}
                    cy={svgN(CY - 0.72 * R_TRACK)}
                    r={1.85}
                    fill="var(--lsw-fuchsia)"
                  />
                </g>
              </>
            )}
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center px-3 text-center">
          <time
            dateTime={isoDurationSeconds(elapsed)}
            className={cn(
              "relative max-w-[92px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.8125rem] font-semibold leading-none tracking-tight tabular-nums",
              "text-slate-800 motion-safe:animate-session-readout-breathe",
              "dark:font-bold dark:text-slate-50 dark:[text-shadow:0_0_12px_rgb(34_211_238/0.35),0_1px_2px_rgb(0_0_0/0.85)]",
            )}
            style={{ fontFeatureSettings: '"tnum" 1' }}
          >
            {timeText}
          </time>

          <div
            className={cn(
              "mx-auto mt-1.5 h-px w-10 rounded-full motion-safe:animate-session-label-shine",
              "bg-gradient-to-r from-transparent via-cyan-600/35 to-transparent",
              "dark:h-[2px] dark:via-cyan-400/50",
            )}
            aria-hidden
          />

          <div className="mt-1.5 flex max-w-[100%] items-center justify-center gap-1 px-0.5">
            {labelParts.right ? (
              <>
                <span className="min-w-0 truncate font-mono text-[7px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-600 dark:font-bold dark:text-slate-300">
                  {labelParts.left}
                </span>
                <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-500/20 motion-safe:animate-ping motion-reduce:hidden dark:bg-cyan-400/25" />
                  <span
                    className={cn(
                      "relative block h-1 w-1 rounded-full bg-cyan-600",
                      "motion-safe:animate-session-status-pulse-light",
                      "dark:bg-cyan-400 dark:shadow-[0_0_6px_rgb(34_211_238/0.95)] motion-safe:dark:animate-session-status-beacon",
                    )}
                  />
                </span>
                <span className="min-w-0 truncate font-mono text-[7px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-600 dark:font-bold dark:text-slate-300">
                  {labelParts.right}
                </span>
              </>
            ) : (
              <span className="min-w-0 truncate font-mono text-[7px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-600 dark:font-bold dark:text-slate-300">
                {labelParts.left}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
