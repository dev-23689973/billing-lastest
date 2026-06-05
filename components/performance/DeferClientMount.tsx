"use client";

import type { ReactNode } from "react";
import { useDeferClientMount } from "@/lib/ui/useDeferClientMount";

export function DeferClientMount({
  children,
  fallback = null,
  timeoutMs = 2000,
  enabled = true,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  timeoutMs?: number;
  enabled?: boolean;
}) {
  const ready = useDeferClientMount(enabled, timeoutMs);
  if (!ready) return fallback;
  return children;
}
