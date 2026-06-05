"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const toastSurfaceClass =
  "border border-border/80 bg-white/95 text-foreground shadow-lg backdrop-blur-sm dark:border-cyan-400/15 dark:bg-[hsl(222_47%_8%/0.96)] dark:text-zinc-50";

const sharedToasterProps = {
  richColors: true as const,
  closeButton: true as const,
  duration: 5000,
  visibleToasts: 4 as const,
  expand: true as const,
  toastOptions: {
    classNames: {
      toast: toastSurfaceClass,
      title: "font-semibold text-foreground",
      description: "text-muted-foreground",
      success: toastSurfaceClass,
      error: toastSurfaceClass,
      warning: toastSurfaceClass,
      info: toastSurfaceClass,
    },
  },
};

/** Global toast stack (Sonner), theme follows billing light/dark toggle. */
export function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      offset="3.5rem"
      mobileOffset={{
        top: "3.25rem",
        right: "0.75rem",
        bottom: "calc(var(--mobile-nav-offset, 0px) + 0.75rem)",
      }}
      className="billing-sonner-toaster"
      {...sharedToasterProps}
    />
  );
}

/** Mount inside native `<dialog open>` so toasts appear above the modal top layer. */
export function DialogLayerToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      id="dialog"
      theme={theme}
      position="top-center"
      offset="1rem"
      className="billing-sonner-toaster billing-sonner-toaster--dialog"
      {...sharedToasterProps}
    />
  );
}
