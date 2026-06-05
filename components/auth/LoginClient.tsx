"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  MessageSquare,
  Radio,
  Shield,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearAnnouncementSessionDismissals } from "@/lib/clear-announcement-session-dismissals";
import { SESSION_STARTED_AT_KEY } from "@/lib/useSessionElapsedSeconds";
import { BillingBrandTitle } from "@/components/theme/BillingBrandTitle";
import { LivingBillingLogo } from "@/components/theme/LivingBillingLogo";
import { LoginHudBackground } from "@/components/auth/LoginHudBackground";
import { FormField } from "@/components/forms/form-field";
import { FormStack } from "@/components/forms/form-stack";
import { Input } from "@/components/ui/input";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import { fetchClientPublicIpForLogin } from "@/lib/fetchClientPublicIp";

type Props = {
  loginAction: (formData: FormData) => void | Promise<void>;
  nextPath: string | undefined;
  isDevelopment: boolean;
  appVersion: string;
  panelTitle: string;
};

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Users,
    title: "Subscriber Operations",
    description: "Full lifecycle from provisioning through renewal and expiry.",
  },
  {
    icon: TrendingUp,
    title: "Credit Management",
    description: "Hierarchical wallets, grants, and recoveries across your tree.",
  },
  {
    icon: Radio,
    title: "STB Monitoring",
    description: "Live device status, MAC checks, and TV platform integration.",
  },
  {
    icon: MessageSquare,
    title: "Messaging Hub",
    description: "Broadcast announcements and targeted operator notifications.",
  },
  {
    icon: Ticket,
    title: "Support Tickets",
    description: "Track, assign, and resolve issues with role-scoped queues.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Revenue trends, subscriber activity, and exportable ledgers.",
  },
];

const CAPABILITY_PILLS = ["Real-time sync", "Multi-tier billing", "MAC verification", "Role-based access"] as const;

function FeatureRow({
  icon: Icon,
  title,
  description,
  style,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  style?: React.CSSProperties;
}) {
  return (
    <li className="login-feature-rise flex gap-3" style={style}>
      <div className="login-feature-icon relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <HudCornerOverlay tone="bright" className="opacity-60 dark:opacity-80" />
        <Icon className="relative z-[3] h-[18px] w-[18px] text-primary" aria-hidden />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

export function LoginClient({ loginAction, nextPath, isDevelopment, appVersion, panelTitle }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [clientPublicIp, setClientPublicIp] = useState("");
  const [loginPending, startLoginTransition] = useTransition();
  const searchParams = useSearchParams();

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    let ip = clientPublicIp.trim();
    if (!ip) ip = await fetchClientPublicIpForLogin();
    if (ip) fd.set("client_public_ip", ip);
    startLoginTransition(() => {
      void loginAction(fd);
    });
  }

  useEffect(() => {
    let cancelled = false;
    void fetchClientPublicIpForLogin().then((ip) => {
      if (!cancelled && ip) setClientPublicIp(ip);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("logout") !== "1") return;
    clearAnnouncementSessionDismissals();
    try {
      sessionStorage.removeItem(SESSION_STARTED_AT_KEY);
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  return (
    <div className="login-page relative flex min-h-full w-full flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <LoginHudBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="login-page-grid grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Branding — desktop */}
          <div className="login-left-panel hidden space-y-5 lg:block lg:space-y-6">
            <div className="flex items-center gap-4">
              <LivingBillingLogo
                size="xl"
                haloPulse
                className="shadow-[0_8px_28px_rgba(8,145,178,0.22)] ring-1 ring-primary/25 dark:shadow-[0_0_32px_rgba(34,211,238,0.2)] dark:ring-cyan-500/30"
              />
              <div>
                <BillingBrandTitle size="hero" title={panelTitle}>
                  {panelTitle}
                </BillingBrandTitle>
                <p className="sidebar-brand-eyebrow mt-1">Management System</p>
              </div>
            </div>

            <div className="login-status-badge login-feature-rise inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]" />
              </span>
              <Wifi className="h-3.5 w-3.5 opacity-80" aria-hidden />
              <span>Platform online — secure session ready</span>
            </div>

            <div className="login-feature-block space-y-4 lg:space-y-5">
              <h2 className="login-headline-shine text-xl font-semibold leading-snug tracking-tight text-foreground lg:text-2xl">
                Comprehensive IPTV
                <br />
                <span className="login-headline-accent">Operations Platform</span>
              </h2>
              <ul className="login-feature-list grid gap-2.5 sm:grid-cols-1 lg:gap-3">
                {FEATURES.map((f, i) => (
                  <FeatureRow
                    key={f.title}
                    icon={f.icon}
                    title={f.title}
                    description={f.description}
                    style={{ animationDelay: `${80 + i * 70}ms` }}
                  />
                ))}
              </ul>
            </div>

            <div className="login-capability-pills flex flex-wrap gap-2">
              {CAPABILITY_PILLS.map((pill, i) => (
                <span
                  key={pill}
                  className="login-capability-pill login-feature-rise inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium"
                  style={{ animationDelay: `${520 + i * 60}ms` }}
                >
                  <Sparkles className="h-3 w-3 text-primary" aria-hidden />
                  {pill}
                </span>
              ))}
            </div>

            <div className="login-meta-row flex flex-wrap items-center gap-2">
              {isDevelopment ? (
                <span className="login-meta-chip rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Development Environment
                </span>
              ) : null}
              <span className="login-version-chip rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums">v{appVersion}</span>
              <span className="login-meta-chip inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-primary" aria-hidden />
                Live billing sync
              </span>
            </div>
          </div>

          {/* Login card */}
          <div className="w-full lg:mx-auto lg:max-w-md">
            <div className="login-card login-card-hud relative overflow-hidden rounded-xl p-6 sm:p-8">
              <HudCornerOverlay tone="bright" className="opacity-40 dark:opacity-100" />
              <div className="relative z-[1]">
                <div className="mb-6 flex items-center gap-3 lg:hidden">
                  <LivingBillingLogo
                    size="md"
                    className="shrink-0 self-center ring-1 ring-primary/20 dark:ring-cyan-500/25"
                  />
                  <div className="flex min-w-0 flex-col justify-center">
                    <BillingBrandTitle size="card" as="p" title={panelTitle}>
                      {panelTitle}
                    </BillingBrandTitle>
                    <p className="sidebar-brand-eyebrow mt-0.5">Management System</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="login-card-icon flex h-9 w-9 items-center justify-center rounded-lg">
                      <Shield className="h-4 w-4 text-primary" aria-hidden />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Welcome back</h2>
                  </div>
                  <p className="text-sm text-muted-foreground sm:text-base">Sign in to access your operations console</p>
                </div>

                <form onSubmit={(e) => void handleLoginSubmit(e)} className="mt-6">
                  <FormStack>
                    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
                    <FormField id="login-username" label="Username">
                      <Input
                        id="login-username"
                        name="username"
                        required
                        autoComplete="username"
                        placeholder="Enter your username"
                        className={cn("login-field h-10 sm:text-sm")}
                      />
                    </FormField>
                    <FormField id="login-password" label="Password">
                      <div className="relative">
                        <Input
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className={cn("login-field h-10 pr-10 sm:text-sm")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>

                    <button
                      type="submit"
                      disabled={loginPending}
                      className={cn(
                        "login-submit mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-[transform,box-shadow,background] duration-200 active:scale-[0.99]",
                        loginPending && "pointer-events-none opacity-70",
                      )}
                    >
                      <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                      Sign in
                    </button>
                  </FormStack>
                </form>
              </div>
            </div>

            <p className="login-feature-rise mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              Secured connection with end-to-end encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
