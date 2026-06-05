"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BillingUrlToastHost } from "@/components/BillingUrlToastHost";
import { AppToaster } from "@/components/ui/sonner";

const DigitalLivingBackdrop = dynamic(
  () => import("@/components/theme/DigitalLivingBackdrop").then((m) => m.DigitalLivingBackdrop),
  { ssr: false, loading: () => null },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DigitalLivingBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <AppToaster />
      <BillingUrlToastHost />
    </ThemeProvider>
  );
}
