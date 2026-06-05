"use client";

import { useSyncExternalStore } from "react";

const HUD_WIDE_MQ = "(min-width: 1280px)";

function subscribeHudWide(cb: () => void) {
  const mq = window.matchMedia(HUD_WIDE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getHudWideSnapshot() {
  return window.matchMedia(HUD_WIDE_MQ).matches;
}

/** True when ticket + message traffic sit side-by-side (1280px+). */
export function useHudWideLayout() {
  return useSyncExternalStore(subscribeHudWide, getHudWideSnapshot, () => false);
}
