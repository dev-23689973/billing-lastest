"use client";

import { cn } from "@/lib/cn";
import { useMotionPaused } from "@/lib/motionLifecycle";

/** Ambient grid, glow, and scan motion behind the login page. */
export function LoginHudBackground() {
  const motionPaused = useMotionPaused();

  return (
    <div
      className={cn(
        "login-hud pointer-events-none absolute inset-0 overflow-hidden",
        motionPaused && "login-hud--paused",
      )}
      aria-hidden
    >
      <div className="login-hud-grid absolute inset-0 opacity-50 dark:opacity-[0.55]" />
      <div className="login-hud-glow login-hud-glow--a absolute -left-[20%] top-[8%] h-[42vmin] w-[42vmin]">
        <div className="login-hud-glow__blob login-hud-glow__blob--cyan" />
        <div className="login-hud-glow__breathe login-hud-glow__breathe--cyan" />
      </div>
      <div className="login-hud-glow login-hud-glow--b absolute -right-[12%] bottom-[6%] h-[38vmin] w-[38vmin]">
        <div className="login-hud-glow__blob login-hud-glow__blob--sky" />
        <div className="login-hud-glow__breathe login-hud-glow__breathe--violet" />
      </div>
      <div className="login-hud-scan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_20px_rgba(8,145,178,0.2)] dark:via-cyan-400/55 dark:shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
      <div className="login-hud-orb login-hud-orb--1 absolute left-[12%] top-[22%] h-1.5 w-1.5 rounded-full bg-cyan-500/80 shadow-[0_0_10px_rgba(8,145,178,0.45)] dark:bg-cyan-400/70 dark:shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
      <div className="login-hud-orb login-hud-orb--2 absolute right-[18%] top-[38%] h-1 w-1 rounded-full bg-sky-400/70 shadow-[0_0_8px_rgba(14,165,233,0.4)] dark:bg-cyan-300/60 dark:shadow-[0_0_10px_rgba(103,232,249,0.7)]" />
      <div className="login-hud-orb login-hud-orb--3 absolute left-[28%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-violet-400/45 shadow-[0_0_8px_rgba(139,92,246,0.35)] dark:bg-violet-400/50 dark:shadow-[0_0_10px_rgba(167,139,250,0.55)]" />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f8fafc] to-transparent",
          "dark:from-[hsl(222_47%_4%/0.92)]",
        )}
      />
    </div>
  );
}
