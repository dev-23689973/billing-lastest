import type { FlashToastItem } from "@/components/FlashToasts";
import { showFlashToastItems } from "@/lib/client/showFlashToastItems";

const scheduledKeys = new Set<string>();

/** Show flash toasts once per navigation key (survives React Strict Mode remounts). */
export function scheduleFlashToastItems(key: string, items: FlashToastItem[]) {
  if (!items.length || scheduledKeys.has(key)) return;
  scheduledKeys.add(key);
  queueMicrotask(() => {
    showFlashToastItems(items);
  });
}

export function flashToastKey(pathname: string, query: string, items: FlashToastItem[]) {
  const messages = items.map((i) => `${i.type}:${i.message}`).join("|");
  return `${pathname}?${query}::${messages}`;
}
